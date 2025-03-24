'use strict';

const ExcelReader = require('./excelReader');
const AutoTagger = require('./autoTagger');

class ExcelProcessor {
    /**
     * Обрабатывает Excel-файл.
     * @param {string} filePath Путь к файлу.
     * @param {Object} [options] Опции обработки.
     * @param {boolean} [options.removeHeaderRow=true] Если true и первая строка данных совпадает с заголовками, удаляет её.
     * @returns {Object} Результат обработки со статистикой и тегированием.
     */
    static async processFile(filePath, options = {}) {
        const { removeHeaderRow = true } = options;
        const reader = new ExcelReader(filePath);
        try {
            reader.load();
            const analysis = reader.analyzeContent();
            const firstSheet = reader.readSheet(analysis.sheets[0].name);

            // Обработка заголовков: обрезаем пробелы и приводим к строке
            const headers = firstSheet.headers.map(header => {
                if (header === null || header === undefined) {
                    return '';
                }
                return String(header).trim();
            });

            // Определяем, какие строки использовать как данные
            let dataRows = firstSheet.rows;
            if (removeHeaderRow && dataRows.length > 0) {
                const firstRowData = dataRows[0].data.map(item => String(item).trim());
                const headerMatch = headers.length === firstRowData.length &&
                    headers.every((header, i) => header === firstRowData[i]);
                if (headerMatch) {
                    dataRows = dataRows.slice(1);
                }
            }

            // Получение данных по колонкам для анализа
            const columnData = {};
            headers.forEach((header, index) => {
                columnData[header] = dataRows.map(row => row.data[index]);
            });

            // Определение типов колонок
            const columnTypes = this.detectColumnTypes(headers, columnData);

            // Обработка данных
            const processedData = dataRows.map((row, index) => {
                const processedRow = new Map();
                headers.forEach((header, colIndex) => {
                    const rawValue = row.data[colIndex];
                    const type = columnTypes.get(header);
                    const formattedValue = this.formatValue(rawValue, type);
                    processedRow.set(header, formattedValue);
                });
                return {
                    rowNumber: index + 1,
                    row: processedRow
                };
            });

            // Подсчет статистики с учетом определенных типов колонок
            const statistics = this.calculateStatistics(headers, columnData, columnTypes);

            // Автоматическое тегирование
            const tagger = new AutoTagger();
            const taggingResult = tagger.analyzeTags({
                headers,
                data: processedData
            });

            return {
                sheetName: firstSheet.sheetName,
                totalRows: dataRows.length,
                totalColumns: headers.length,
                headers,
                data: processedData,
                metadata: {
                    columnTypes,
                    statistics,
                    tagging: {
                        tags: taggingResult,
                        categories: {
                            business: [],
                            technical: [],
                            content: [],
                            other: []
                        }
                    }
                }
            };
        } catch (error) {
            throw new Error(`Ошибка обработки Excel файла: ${error.message}`);
        } finally {
            reader.cleanup();
        }
    }

    static formatValue(value, type) {
        if (value === null || value === undefined || String(value).trim() === '') {
            return '';
        }

        let strValue = String(value).trim();

        switch (type) {
            case 'date':
                try {
                    if (typeof value === 'number') {
                        // Обработка Excel-дат
                        const excelDate = new Date((value - 25569) * 86400 * 1000);
                        return excelDate.toISOString().split('T')[0];
                    }
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                    return strValue;
                } catch {
                    return strValue;
                }

            case 'number':
                try {
                    // Если строка содержит и запятую, и точку, удаляем запятые (предполагаем, что запятая — разделитель тысяч)
                    if (strValue.includes(',') && strValue.includes('.')) {
                        strValue = strValue.replace(/,/g, '');
                    } else {
                        // Иначе заменяем запятую на точку
                        strValue = strValue.replace(',', '.');
                    }
                    // Удаляем все символы, кроме цифр, точки и знака минус
                    const normalized = strValue.replace(/[^\d.-]/g, '');
                    const num = parseFloat(normalized);
                    return isNaN(num) ? strValue : num.toFixed(2);
                } catch {
                    return strValue;
                }

            default:
                return strValue;
        }
    }

    static detectColumnTypes(headers, columnData) {
        const types = new Map();
        headers.forEach(header => {
            const values = columnData[header].filter(v => v != null && String(v).trim() !== '');
            if (header.toLowerCase().includes('дата')) {
                types.set(header, 'date');
            } else if (
                header.toLowerCase().includes('сумма') ||
                header.toLowerCase().includes('количество') ||
                values.every(v => !isNaN(parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))))
            ) {
                types.set(header, 'number');
            } else {
                types.set(header, 'text');
            }
        });
        return types;
    }

    /**
     * Подсчитывает статистику по колонкам на основе полученных данных и определенных типов колонок.
     * @param {Array} headers Массив заголовков.
     * @param {Object} columnData Объект с данными по каждой колонке.
     * @param {Map} columnTypes Карта типов колонок.
     * @returns {Object} Объект статистики.
     */
    static calculateStatistics(headers, columnData, columnTypes) {
        const stats = {
            emptyValues: 0,
            numericalColumns: [],
            categoricalColumns: [],
            uniqueValuesCount: {}
        };

        headers.forEach(header => {
            const values = columnData[header];
            const nonEmptyValues = values.filter(v => v != null && String(v).trim() !== '');
            // Подсчет уникальных значений
            const uniqueValues = new Set(nonEmptyValues.map(v => String(v).trim()));
            stats.uniqueValuesCount[header] = uniqueValues.size;
            // Подсчет пустых значений
            stats.emptyValues += values.length - nonEmptyValues.length;
            // Если тип колонки определяется как number Или если заголовок содержит "сумма" или "количество"
            if (
                columnTypes.get(header) === 'number' ||
                header.trim().toLowerCase().includes('сумма') ||
                header.trim().toLowerCase().includes('количество')
            ) {
                stats.numericalColumns.push(header);
            } else {
                stats.categoricalColumns.push(header);
            }
        });

        // Дополнительный фолбэк: если среди числовых колонок не найден ровно заголовок "Сумма продажи",
        // пытаемся добавить его, если он присутствует в исходных заголовках.
        if (!stats.numericalColumns.some(h => h.trim().toLowerCase() === 'сумма продажи')) {
            const saleHeader = headers.find(h => h.trim().toLowerCase() === 'сумма продажи');
            if (saleHeader) {
                stats.numericalColumns.push(saleHeader);
            }
        }

        return stats;
    }
}

module.exports = ExcelProcessor;

