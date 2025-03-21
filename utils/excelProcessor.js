const ExcelReader = require('./excelReader');
const AutoTagger = require('./autoTagger');
const ExcelFormatHandler = require('./excelFormatHandler');

class ExcelProcessor {
    static async processFile(filePath) {
        const reader = new ExcelReader(filePath);
        const tagger = new AutoTagger();

        try {
            reader.load();
            const analysis = reader.analyzeContent();
            const firstSheet = reader.readSheet(analysis.sheets[0].name);

            // Обработка заголовков
            const headers = firstSheet.headers.map(header => {
                if (header === null || header === undefined) {
                    return '';
                }
                return String(header).trim();
            });

            // Пропускаем строку заголовков при обработке данных
            const dataRows = firstSheet.rows.slice(1);

            // Обработка данных
            const processedData = {
                sheetName: firstSheet.sheetName,
                totalRows: dataRows.length + 1, // +1 для заголовков
                totalColumns: headers.length,
                headers: headers,
                data: dataRows.map((row, index) => ({
                    rowNumber: index + 2, // +2 так как индекс начинается с 0 и пропустили заголовок
                    row: new Map(
                        headers.map((header, colIndex) => {
                            const value = row.data[colIndex];
                            return [
                                header,
                                ExcelFormatHandler.autoFormat(value, this.detectColumnType(header, value))
                            ];
                        })
                    )
                }))
            };

            // Анализ данных для тегов
            const columnData = {};
            headers.forEach((header, index) => {
                columnData[header] = dataRows.map(row => row.data[index]);
            });

            // Подсчет уникальных значений
            const uniqueValuesCount = {};
            for (const [header, values] of Object.entries(columnData)) {
                const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));
                uniqueValuesCount[header] = uniqueValues.size;
            }

            // Автоматическое тегирование
            const tags = tagger.analyzeTags({
                headers: headers,
                data: processedData.data
            });

            return {
                ...processedData,
                metadata: {
                    columnTypes: this.detectColumnTypes(columnData),
                    suggestedTags: tags,
                    processingDate: new Date().toISOString(),
                    fileAnalysis: {
                        hasHeaders: true,
                        uniqueValuesCount: uniqueValuesCount
                    }
                }
            };

        } catch (error) {
            throw new Error(`Ошибка обработки Excel файла: ${error.message}`);
        } finally {
            reader.cleanup();
        }
    }

    static detectColumnType(header, value) {
        if (!value) return 'text';
        
        const headerLower = header.toLowerCase();
        if (headerLower.includes('дата')) return 'date';
        if (headerLower.includes('сумма') || headerLower.includes('цена')) return 'number';
        
        if (typeof value === 'number') return 'number';
        if (!isNaN(Date.parse(value))) return 'date';
        
        return 'text';
    }

    static detectColumnTypes(columnData) {
        const types = {};
        for (const [header, values] of Object.entries(columnData)) {
            const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
            if (nonEmptyValues.length === 0) {
                types[header] = 'text';
                continue;
            }

            const numberCount = nonEmptyValues.filter(v => !isNaN(parseFloat(v))).length;
            const dateCount = nonEmptyValues.filter(v => !isNaN(Date.parse(v))).length;


            if (dateCount / nonEmptyValues.length > 0.7) types[header] = 'date';
            else if (numberCount / nonEmptyValues.length > 0.7) types[header] = 'number';
            else types[header] = 'text';
        }
        return types;
    }
}

module.exports = ExcelProcessor;