"use strict";

const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Улучшенная функция sanitize
 * @param {*} cell - Значение ячейки для очистки
 * @returns {string|number} - Очищенное значение
 */
function sanitize(cell) {
    // Базовая проверка на null/undefined
    if (cell === null || cell === undefined) return '';

    // Если это дата
    if (cell instanceof Date) {
        return cell.toISOString().split('T')[0];
    }

    // Если это число
    if (typeof cell === 'number') {
        // Проверка на Excel serial date
        if (cell > 25569 && cell < 47483) {
            return ExcelParser.excelDateToJSDate(cell);
        }
        return Number.isInteger(cell) ? cell : Number(cell.toFixed(2));
    }

    // Преобразование в строку и базовая очистка
    let str = cell.toString().trim();
    if (!str) return '';

    // Проверка на формулы
    if (str.startsWith('=')) {
        return str.substring(1);
    }

    // Проверка на HTML
    str = str.replace(/<[^>]*>/g, '');

    // Проверка на число в строковом формате
    if (/^\-?\d+\.?\d*$/.test(str)) {
        const num = parseFloat(str);
        return Number.isInteger(num) ? num : Number(num.toFixed(2));
    }

    // Ограничение длины строки
    return str.length > 1000 ? str.substring(0, 1000) : str;
}

class ExcelParser {
    /**
     * Парсинг Excel файла
     * @param {string} filePath - Путь к файлу
     * @returns {Object} - Распарсенные данные
     */
    static parse(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found: " + filePath);
        }

        const workbook = xlsx.readFile(filePath, { 
            cellDates: true,
            cellNF: true,
            cellFormula: true
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        return this.processWorksheet(worksheet, sheetName);
    }

    /**
     * Обработка листа Excel
     * @param {Object} worksheet - Лист Excel
     * @param {string} sheetName - Название листа
     * @returns {Object} - Обработанные данные
     */
    static processWorksheet(worksheet, sheetName) {
        let rawData = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false
        });

        // Очистка данных
        rawData = rawData
            .map(row => row.map(cell => sanitize(cell)))
            .filter(row => row.some(cell => cell !== ''));

        if (!rawData.length) {
            return this.createEmptyResult(sheetName);
        }

        const headers = rawData[0].map(h => sanitize(h));
        const data = [];

        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            const rowData = new Map();

            headers.forEach((header, index) => {
                const value = row[index] || '';
                rowData.set(header, {
                    value: value,
                    type: this.determineCellType(value)
                });
            });

            if (row[0]) {
                data.push({
                    rowNumber: i,
                    label: row[0],
                    cells: rowData,
                    tags: this.generateRowTags(row, headers)
                });
            }
        }

        return {
            headers,
            data,
            metadata: {
                statistics: {
                    rowCount: data.length,
                    columnCount: headers.length,
                    processedAt: new Date()
                },
                columnTypes: this.determineColumnTypes(headers, data),
                sheetName
            }
        };
    }

    /**
     * Определение типов столбцов
     * @param {Array} headers - Заголовки
     * @param {Array} data - Данные
     * @returns {Map} - Типы столбцов
     */
    static determineColumnTypes(headers, data) {
        const columnTypes = new Map();
        const samples = new Map(headers.map(h => [h, []]));

        // Собираем образцы данных для каждого столбца
        data.forEach(row => {
            headers.forEach(header => {
                const cell = row.cells.get(header);
                if (cell && cell.value !== '') {
                    samples.get(header).push(cell.value);
                }
            });
        });

        // Определяем тип для каждого столбца
        headers.forEach(header => {
            const headerLower = header.toLowerCase();
            const sampleValues = samples.get(header);

            if (headerLower.includes('дата') || this.isDateColumn(sampleValues)) {
                columnTypes.set(header, 'date');
            } else if (this.isNumericColumn(sampleValues)) {
                columnTypes.set(header, 'number');
            } else {
                columnTypes.set(header, 'text');
            }
        });

        return columnTypes;
    }

    /**
     * Определение типа данных ячейки
     * @param {*} value - Значение для анализа
     * @returns {string} - Тип данных
     */
    static determineCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }

        if (value instanceof Date) {
            return 'date';
        }

        if (typeof value === 'number') {
            return 'number';
        }

        const strValue = value.toString().trim();

        // Проверка на дату
        if (/^\d{4}-\d{2}-\d{2}$/.test(strValue) || 
            /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue)) {
            return 'date';
        }

        // Проверка на число
        if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
            return 'number';
        }

        return 'text';
    }

    /**
     * Генерация тегов для строки
     * @param {Array} row - Строка данных
     * @param {Array} headers - Заголовки
     * @returns {Array} - Теги
     */
    static generateRowTags(row, headers) {
        const tags = new Set();

        // Добавляем значимые слова из строки
        row.forEach((cell, index) => {
            if (cell) {
                const cellStr = cell.toString();
                // Поиск дат
                const years = cellStr.match(/\b(19|20)\d{2}\b/g);
                if (years) {
                    years.forEach(year => tags.add(year));
                }

                // Поиск значимых слов
                const words = cellStr.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
                if (words) {
                    words.forEach(word => tags.add(word.toLowerCase()));
                }

                // Добавляем заголовок как тег
                if (headers[index] && typeof headers[index] === 'string') {
                    tags.add(headers[index].toLowerCase());
                }
            }
        });

        return Array.from(tags);
    }

    /**
     * Создание пустого результата
     * @param {string} sheetName - Название листа
     * @returns {Object} - Пустой результат
     */
    static createEmptyResult(sheetName) {
        return {
            headers: [],
            data: [],
            metadata: {
                statistics: {
                    rowCount: 0,
                    columnCount: 0,
                    processedAt: new Date()
                },
                columnTypes: new Map(),
                sheetName
            }
        };
    }

    /**
     * Проверка, является ли столбец датами
     * @param {Array} values - Значения для проверки
     * @returns {boolean} - Результат проверки
     */
    static isDateColumn(values) {
        const dateValues = values.filter(v => 
            v instanceof Date || 
            /^\d{4}-\d{2}-\d{2}$/.test(v) || 
            /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(v)
        );
        return dateValues.length > values.length * 0.7;
    }

    /**
     * Проверка, является ли столбец числовым
     * @param {Array} values - Значения для проверки
     * @returns {boolean} - Результат проверки
     */
    static isNumericColumn(values) {
        const numericValues = values.filter(v => 
            typeof v === 'number' || 
            /^-?\d+([.,]\d+)?$/.test(v)
        );
        return numericValues.length > values.length * 0.7;
    }

    /**
     * Преобразование Excel даты в JS дату
     * @param {number} serial - Excel дата
     * @returns {Date} - JavaScript дата
     */
    static excelDateToJSDate(serial) {
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
}

class ExcelProcessor extends ExcelParser {
  /**
   * Обработка файла Excel
   * @param {string} filePath - Путь к файлу
   * @param {Object} options - Опции обработки
   * @returns {Promise<Object>} - Обработанные данные
   */
  static async processFile(filePath, options = {}) {
      const result = this.parse(filePath);
      
      // Добавляем дополнительные метаданные
      const fileStats = fs.statSync(filePath);
      
      return {
          ...result,
          metadata: {
              ...result.metadata,
              fileInfo: {
                  size: fileStats.size,
                  created: fileStats.birthtime,
                  modified: fileStats.mtime,
                  path: filePath,
                  name: filePath.split('/').pop()
              },
              processing: {
                  vertical: false,
                  totalRows: result.data.length + 1,
                  totalColumns: result.headers.length,
                  options: options
              }
          }
      };
  }

  /**
   * Транспонирование матрицы данных
   * @param {Array} matrix - Матрица для транспонирования
   * @returns {Array} - Транспонированная матрица
   */
  static transpose(matrix) {
      if (!matrix.length) return [];
      return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  /**
   * Валидация данных
   * @param {Object} data - Данные для валидации
   * @returns {boolean} - Результат валидации
   */
  static validateData(data) {
      if (!data || !Array.isArray(data.data)) {
          return false;
      }

      // Проверка структуры данных
      const validStructure = data.data.every(row => {
          return typeof row === 'object' &&
                 typeof row.rowNumber === 'number' &&
                 row.cells instanceof Map &&
                 Array.isArray(row.tags);
      });

      // Проверка метаданных
      const validMetadata = data.metadata &&
                          typeof data.metadata.statistics === 'object' &&
                          data.metadata.columnTypes instanceof Map;

      return validStructure && validMetadata;
  }

  /**
   * Извлечение метаданных файла
   * @param {string} filePath - Путь к файлу
   * @returns {Object} - Метаданные
   */
  static extractFileMetadata(filePath) {
      const stats = fs.statSync(filePath);
      return {
          fileName: filePath.split('/').pop(),
          fileSize: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          extension: filePath.split('.').pop().toLowerCase(),
          path: filePath
      };
  }
}

module.exports = {
  ExcelProcessor,
  ExcelParser,
  sanitize
};




