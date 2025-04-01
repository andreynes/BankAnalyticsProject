"use strict";

const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Улучшенная функция sanitize
 * @param {*} cell - Значение ячейки для очистки
 * @param {ExcelParser} parser - Экземпляр парсера
 * @returns {string|number|Date} - Очищенное значение
 */
function sanitize(cell, parser) {
    // Базовая проверка на null/undefined
    if (cell === null || cell === undefined) return '';

    // Если это дата
    if (cell instanceof Date) {
        return cell;
    }

    // Если это число
    if (typeof cell === 'number') {
        // Проверка на Excel serial date
        if (cell > 25569 && cell < 47483) {
            return parser.excelDateToJSDate(cell);
        }
        return Number.isFinite(cell) ? cell : '';
    }

    // Преобразование в строку и базовая очистка
    let str = String(cell).trim();
    if (!str) return '';

    // Проверка на формулы
    if (str.startsWith('=')) {
        try {
            return str.substring(1).replace(/[<>]|javascript:|data:/gi, '').trim();
        } catch (e) {
            return '';
        }
    }

    // Проверка на HTML
    str = str.replace(/<[^>]*>/g, '');

    // Проверка на число в строковом формате
    if (/^\-?\d+\.?\d*$/.test(str)) {
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : str;
    }

    // Ограничение длины строки и безопасная обработка
    return str.length > 1000 ? str.substring(0, 1000) : str;
}

class ExcelParser {
    constructor(options = {}) {
        this.options = {
            cellDates: true,
            cellNF: true,
            cellFormula: true,
            ...options
        };
    }

    /**
     * Парсинг Excel файла
     * @param {string} filePath - Путь к файлу
     * @returns {Object} - Распарсенные данные
     */
    parse(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found: " + filePath);
        }

        try {
            const workbook = xlsx.readFile(filePath, this.options);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            return this.processWorksheet(worksheet, sheetName);
        } catch (error) {
            throw new Error(`Error parsing Excel file: ${error.message}`);
        }
    }

    /**
     * Обработка листа Excel
     * @param {Object} worksheet - Лист Excel
     * @param {string} sheetName - Название листа
     * @returns {Object} - Обработанные данные
     */
    processWorksheet(worksheet, sheetName) {
        try {
            let rawData = xlsx.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                raw: false
            });

            // Очистка данных
            rawData = rawData
                .map(row => row.map(cell => sanitize(cell, this)))
                .filter(row => row.some(cell => cell !== ''));

            if (!rawData.length) {
                return this.createEmptyResult(sheetName);
            }

            // Обработка заголовков
            const headers = rawData[0].map(h => String(h || '').trim());
            if (!headers.some(h => h !== '')) {
                return this.createEmptyResult(sheetName);
            }

            const data = [];
            const processedHeaders = headers.map(h => h || `Column${data.length + 1}`);

            // Обработка строк данных
            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row.some(cell => cell !== '')) continue;

                const rowData = {
                    rowNumber: i,
                    label: row[0] || '',
                    cells: new Map()
                };

                processedHeaders.forEach((header, index) => {
                    const value = row[index] ?? '';
                    rowData.cells.set(header, {
                        value: value,
                        type: this.determineCellType(value)
                    });
                });

                data.push(rowData);
            }

            // Обработка объединенных ячеек
            const mergedCells = worksheet['!merges']?.map(range => ({
                start: { row: range.s.r, col: range.s.c },
                end: { row: range.e.r, col: range.e.c }
            })) || [];

            return {
                headers: processedHeaders,
                data,
                metadata: {
                    statistics: {
                        rowCount: data.length,
                        columnCount: processedHeaders.length,
                        processedAt: new Date(),
                        emptyRows: rawData.length - data.length - 1
                    },
                    columnTypes: this.determineColumnTypes(processedHeaders, data),
                    mergedCells,
                    sheetName
                }
            };
        } catch (error) {
            throw new Error(`Error processing worksheet: ${error.message}`);
        }
    }

    /**
     * Определение типов столбцов
     */
    determineColumnTypes(headers, data) {
        const columnTypes = new Map();
        const samples = new Map();

        headers.forEach(header => {
            if (header) {
                samples.set(header, []);
            }
        });

        data.forEach(row => {
            headers.forEach(header => {
                if (header && row.cells.has(header)) {
                    const cell = row.cells.get(header);
                    if (cell && cell.value !== '') {
                        samples.get(header).push(cell.value);
                    }
                }
            });
        });

        headers.forEach(header => {
            if (header) {
                const headerStr = String(header);
                const sampleValues = samples.get(header) || [];

                if (headerStr.toLowerCase().includes('дата') || this.isDateColumn(sampleValues)) {
                    columnTypes.set(header, 'date');
                } else if (this.isNumericColumn(sampleValues)) {
                    columnTypes.set(header, 'number');
                } else if (this.isPercentageColumn(sampleValues)) {
                    columnTypes.set(header, 'percentage');
                } else if (this.isCurrencyColumn(sampleValues)) {
                    columnTypes.set(header, 'currency');
                } else {
                    columnTypes.set(header, 'text');
                }
            }
        });

        return columnTypes;
    }

    /**
     * Определение типа данных ячейки
     */
    determineCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }

        if (value instanceof Date) {
            return 'date';
        }

        if (typeof value === 'number') {
            return 'number';
        }

        const strValue = String(value).trim();

        // Проверка на процент
        if (/^-?\d+([.,]\d+)?%$/.test(strValue)) {
            return 'percentage';
        }

        // Проверка на валюту
        if (/^[₽$€¥£]/.test(strValue) || /[-0-9,]+(\.\d+)?[$€£¥]$/.test(strValue)) {
            return 'currency';
        }

        // Проверка на дату
        if (/^\d{4}-\d{2}-\d{2}$/.test(strValue) ||
            /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue) ||
            /^\d{4}$/.test(strValue)) {
            return 'date';
        }

        // Проверка на число
        if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
            return 'number';
        }

        return 'text';
    }

    /**
     * Проверка, является ли столбец датами
     */
    isDateColumn(values) {
        if (!Array.isArray(values) || values.length === 0) return false;

        const dateValues = values.filter(v => {
            if (v instanceof Date) return true;
            const str = String(v);
            return /^\d{4}-\d{2}-\d{2}$/.test(str) ||
                   /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(str) ||
                   /^\d{4}$/.test(str);
        });
        return dateValues.length > values.length * 0.7;
    }

    /**
     * Проверка, является ли столбец числовым
     */
    isNumericColumn(values) {
        if (!Array.isArray(values) || values.length === 0) return false;

        const numericValues = values.filter(v => {
            if (typeof v === 'number') return true;
            if (typeof v !== 'string') return false;
            return /^-?\d+([.,]\d+)?$/.test(v.trim()) ||
                   /^-?\d+([.,]\d+)?%$/.test(v.trim()) ||
                   /^[₽$€¥£]\s*\d+([.,]\d+)?$/.test(v.trim());
        });
        return numericValues.length > values.length * 0.7;
    }

    /**
     * Проверка, является ли столбец процентами
     */
    isPercentageColumn(values) {
      if (!Array.isArray(values) || values.length === 0) return false;

      const percentValues = values.filter(v => {
          if (typeof v !== 'string') return false;
          return /^-?\d+([.,]\d+)?%$/.test(v.trim());
      });
      return percentValues.length > values.length * 0.7;
  }

  /**
   * Проверка, является ли столбец валютой
   */
  isCurrencyColumn(values) {
      if (!Array.isArray(values) || values.length === 0) return false;

      const currencyValues = values.filter(v => {
          if (typeof v !== 'string') return false;
          return /^[₽$€¥£]/.test(v.trim()) || /[-0-9,]+(\.\d+)?[$€£¥]$/.test(v.trim());
      });
      return currencyValues.length > values.length * 0.7;
  }

  /**
   * Преобразование Excel даты в JS дату
   */
  excelDateToJSDate(serial) {
      try {
          const utc_days = Math.floor(serial - 25569);
          const utc_value = utc_days * 86400;
          const date_info = new Date(utc_value * 1000);
          return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
      } catch (error) {
          console.error('Error converting Excel date:', error);
          return new Date();
      }
  }

  /**
   * Создание пустого результата
   */
  createEmptyResult(sheetName) {
      return {
          headers: [],
          data: [],
          metadata: {
              statistics: {
                  rowCount: 0,
                  columnCount: 0,
                  processedAt: new Date(),
                  emptyRows: 0
              },
              columnTypes: new Map(),
              mergedCells: [],
              sheetName
          }
      };
  }

  /**
   * Проверка корректности даты
   */
  isValidDate(date) {
      return date instanceof Date && !isNaN(date);
  }

  /**
   * Безопасное преобразование в число
   */
  safeParseNumber(value) {
      if (typeof value === 'number') return value;
      if (typeof value !== 'string') return null;

      const cleaned = value.replace(/[^-0-9.,]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
  }

  /**
   * Обработка специальных символов
   */
  handleSpecialCharacters(text) {
      if (typeof text !== 'string') return '';
      
      return text
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Удаление управляющих символов
          .replace(/[^\x20-\x7E\xA0-\xFF]/g, '') // Оставляем только печатные символы
          .trim();
  }

  /**
   * Проверка и очистка значения ячейки
   */
  validateCellValue(value, maxLength = 1000) {
      if (value === null || value === undefined) return '';
      
      if (value instanceof Date) {
          return this.isValidDate(value) ? value : '';
      }

      if (typeof value === 'number') {
          return isFinite(value) ? value : '';
      }

      const strValue = String(value).trim();
      if (strValue.startsWith('=')) {
          return strValue.substring(1)
              .replace(/[<>]|javascript:|data:/gi, '')
              .trim();
      }

      return this.handleSpecialCharacters(strValue.substring(0, maxLength));
  }
}

// Добавляем статический метод для обратной совместимости
ExcelParser.parse = function(filePath, options) {
  const parser = new ExcelParser(options);
  return parser.parse(filePath);
};

module.exports = ExcelParser;
module.exports.sanitize = sanitize;





