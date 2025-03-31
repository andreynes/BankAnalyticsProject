// utils/excelProcessor.js

const BaseDataProcessor = require('./baseDataProcessor');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

class ExcelProcessor extends BaseDataProcessor {
    constructor(options = {}) {
        super({
            supportedFormats: ['.xlsx', '.xls'],
            ...options
        });
    }

    /**
     * Обработка Excel файла
     * @param {string} filePath - Путь к файлу
     * @returns {Promise<Object>} - Обработанные данные
     */
    static async processFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found: " + filePath);
        }

        const workbook = xlsx.readFile(filePath, {
            cellDates: true,
            cellNF: true,
            cellFormula: true,
            dateNF: 'yyyy-mm-dd',
            cellStyles: true,
            cellText: false
        });

        const result = {
            fileName: path.basename(filePath),
            documentType: 'excel',
            globalTags: new Set(),
            blocks: [],
            metadata: {
                statistics: {
                    fileSize: fs.statSync(filePath).size,
                    sheets: workbook.SheetNames.length,
                    processedAt: new Date(),
                    totalCells: 0,
                    totalRows: 0,
                    emptyRows: 0,
                    mergedCells: 0
                }
            }
        };

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const block = await ExcelProcessor.processWorksheet(worksheet, sheetName);
            result.blocks.push(block);
            
            // Обновляем статистику
            result.metadata.statistics.totalCells += block.metadata.totalCells;
            result.metadata.statistics.totalRows += block.metadata.rowCount;
            result.metadata.statistics.emptyRows += block.metadata.emptyRows || 0;
            result.metadata.statistics.mergedCells += (block.content.mergedCells || []).length;
            
            // Добавляем теги листа в глобальные теги
            block.tags.forEach(tag => result.globalTags.add(tag));
        }

        result.globalTags = Array.from(result.globalTags);
        return result;
    }

    /**
     * Обработка листа Excel
     * @param {Object} worksheet - Лист Excel
     * @param {string} sheetName - Название листа
     * @returns {Promise<Object>} - Блок данных
     */
    static async processWorksheet(worksheet, sheetName) {
        const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const mergedCells = worksheet['!merges'] || [];
        const rawData = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
            dateNF: 'yyyy-mm-dd'
        });

        if (!rawData.length) {
            return ExcelProcessor.createEmptyBlock(sheetName);
        }

        const structure = ExcelProcessor.analyzeWorksheetStructure(rawData, mergedCells);
        const processedRows = ExcelProcessor.processDataRows(
            rawData.slice(structure.headerRows.length), 
            structure.headers,
            mergedCells
        );

        const content = {
            headers: structure.headers,
            rows: processedRows.map((row, index) => ({
                rowNumber: index + 1,
                cells: new Map(Object.entries(row)),
                isEmpty: Object.values(row).every(cell => cell.type === 'empty')
            })),
            mergedCells: ExcelProcessor.processMergedCells(mergedCells, rawData)
        };

        const emptyRows = content.rows.filter(row => row.isEmpty).length;
        const totalCells = content.rows.reduce((sum, row) => sum + row.cells.size, 0);

        return {
            type: 'table',
            source: 'excel',
            content: content,
            tags: ExcelProcessor.extractTags(rawData, structure.headers),
            metadata: {
                sheetName,
                rowCount: content.rows.length,
                columnCount: structure.headers.length,
                totalCells,
                emptyRows,
                hasMergedCells: mergedCells.length > 0,
                dimensions: {
                    startRow: range.s.r,
                    endRow: range.e.r,
                    startCol: range.s.c,
                    endCol: range.e.c
                }
            }
        };
    }

    /**
     * Обработка объединенных ячеек
     * @param {Array} mergedCells - Информация об объединенных ячейках
     * @param {Array} rawData - Исходные данные
     * @returns {Array} - Обработанные объединенные ячейки
     */
    static processMergedCells(mergedCells, rawData) {
        return mergedCells.map(range => {
            const value = rawData[range.s.r] && rawData[range.s.r][range.s.c];
            return {
                start: { row: range.s.r, col: range.s.c },
                end: { row: range.e.r, col: range.e.c },
                value: ExcelProcessor.sanitizeValue(value),
                type: ExcelProcessor.determineCellType(value)
            };
        });
    }
    /**
     * Анализ структуры листа Excel
     * @param {Array} rawData - Сырые данные листа
     * @param {Array} mergedCells - Информация об объединенных ячейках
     * @returns {Object} - Структура данных листа
     */
    static analyzeWorksheetStructure(rawData, mergedCells) {
      const headerRows = ExcelProcessor.detectHeaderRows(rawData);
      const headers = ExcelProcessor.processHeaders(headerRows, mergedCells);
      
      return {
          headerRows: headerRows,
          headers: headers,
          hasMultiLevelHeaders: headerRows.length > 1
      };
  }

  /**
   * Определение строк заголовков
   * @param {Array} data - Данные листа
   * @returns {Array} - Строки заголовков
   */
  static detectHeaderRows(data) {
      const headerRows = [];
      const maxHeaderRows = Math.min(data.length, 5); // Максимум 5 строк заголовков

      for (let i = 0; i < maxHeaderRows; i++) {
          if (ExcelProcessor.isHeaderRow(data[i])) {
              headerRows.push(data[i]);
          } else {
              break;
          }
      }
      return headerRows;
  }

  /**
   * Проверка, является ли строка заголовком
   * @param {Array} row - Строка данных
   * @returns {boolean} - Результат проверки
   */
  static isHeaderRow(row) {
      if (!Array.isArray(row)) return false;
      
      // Подсчет значимых ячеек
      const cells = row.map(cell => ({
          value: cell,
          isEmpty: cell === null || cell === undefined || cell.toString().trim() === '',
          isNumeric: !isNaN(cell) && typeof cell !== 'string'
      }));

      const nonEmptyCells = cells.filter(cell => !cell.isEmpty).length;
      const numericCells = cells.filter(cell => cell.isNumeric).length;

      // Строка считается заголовком, если:
      // 1. Содержит хотя бы одну непустую ячейку
      // 2. Большинство ячеек не являются числами
      // 3. Не содержит формул
      return nonEmptyCells > 0 && 
             numericCells < nonEmptyCells / 2 &&
             !cells.some(cell => cell.value?.toString().startsWith('='));
  }

  /**
   * Обработка заголовков
   * @param {Array} headerRows - Строки заголовков
   * @param {Array} mergedCells - Информация об объединенных ячейках
   * @returns {Array} - Обработанные заголовки
   */
  static processHeaders(headerRows, mergedCells) {
      if (!headerRows.length) return [];

      const headers = [];
      const processedCells = new Set();
      const mergeMap = new Map();

      // Создаем карту объединенных ячеек
      mergedCells.forEach(merge => {
          for (let r = merge.s.r; r <= merge.e.r; r++) {
              for (let c = merge.s.c; c <= merge.e.c; c++) {
                  mergeMap.set(`${r}-${c}`, {
                      start: merge.s,
                      end: merge.e,
                      value: null
                  });
              }
          }
      });

      headerRows.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
              const cellKey = `${rowIndex}-${colIndex}`;
              if (!cell || processedCells.has(cellKey)) return;

              const mergeInfo = mergeMap.get(cellKey);
              const span = mergeInfo ? {
                  rowSpan: mergeInfo.end.r - mergeInfo.start.r + 1,
                  colSpan: mergeInfo.end.c - mergeInfo.start.c + 1
              } : { rowSpan: 1, colSpan: 1 };

              if (mergeInfo) {
                  for (let r = mergeInfo.start.r; r <= mergeInfo.end.r; r++) {
                      for (let c = mergeInfo.start.c; c <= mergeInfo.end.c; c++) {
                          processedCells.add(`${r}-${c}`);
                      }
                  }
              }

              const headerValue = ExcelProcessor.sanitizeHeaderValue(cell);
              if (headerValue) {
                  headers.push({
                      value: headerValue,
                      level: rowIndex + 1,
                      column: colIndex,
                      span: span,
                      parent: ExcelProcessor.findHeaderParent(headerRows, rowIndex, colIndex),
                      isMerged: !!mergeInfo
                  });
              }
          });
      });

      return headers;
  }

  /**
   * Очистка значения заголовка
   * @param {*} value - Значение для очистки
   * @returns {string|null} - Очищенное значение
   */
  static sanitizeHeaderValue(value) {
      if (!value) return null;
      const sanitized = String(value)
          .replace(/<[^>]+>/g, '')  // Удаляем HTML
          .replace(/&[^;]+;/g, '')  // Удаляем HTML entities
          .replace(/\s+/g, ' ')     // Нормализуем пробелы
          .trim();
      return sanitized || null;
  }

  /**
   * Поиск родительского заголовка
   * @param {Array} headerRows - Строки заголовков
   * @param {number} rowIndex - Индекс строки
   * @param {number} colIndex - Индекс колонки
   * @returns {string|null} - Значение родительского заголовка
   */
  static findHeaderParent(headerRows, rowIndex, colIndex) {
      if (rowIndex === 0) return null;
      
      for (let r = rowIndex - 1; r >= 0; r--) {
          const parentCell = headerRows[r][colIndex];
          if (parentCell) {
              const parentValue = ExcelProcessor.sanitizeHeaderValue(parentCell);
              if (parentValue) return parentValue;
          }
      }
      return null;
  }

  /**
   * Обработка строк данных
   * @param {Array} dataRows - Строки данных
   * @param {Array} headers - Заголовки
   * @param {Array} mergedCells - Объединенные ячейки
   * @returns {Array} - Обработанные данные
   */
  static processDataRows(dataRows, headers, mergedCells) {
      const mergeMap = ExcelProcessor.createMergeMap(mergedCells);
      
      return dataRows.map((row, rowIndex) => {
          const processedRow = {};
          headers.forEach((header, colIndex) => {
              const cellValue = row[header.column];
              const mergeInfo = mergeMap.get(`${rowIndex + headers.length}-${colIndex}`);
              
              processedRow[header.value] = {
                  value: ExcelProcessor.sanitizeValue(cellValue),
                  type: ExcelProcessor.determineCellType(cellValue),
                  metadata: ExcelProcessor.extractCellMetadata(cellValue, header, mergeInfo)
              };
          });
          return processedRow;
      });
  }

  /**
   * Создание карты объединенных ячеек
   * @param {Array} mergedCells - Объединенные ячейки
   * @returns {Map} - Карта объединенных ячеек
   */
  static createMergeMap(mergedCells) {
      const mergeMap = new Map();
      mergedCells.forEach(merge => {
          for (let r = merge.s.r; r <= merge.e.r; r++) {
              for (let c = merge.s.c; c <= merge.e.c; c++) {
                  mergeMap.set(`${r}-${c}`, {
                      start: merge.s,
                      end: merge.e
                  });
              }
          }
      });
      return mergeMap;
  }

  /**
   * Извлечение метаданных ячейки
   * @param {*} value - Значение ячейки
   * @param {Object} header - Информация о заголовке
   * @param {Object} mergeInfo - Информация об объединении
   * @returns {Object} - Метаданные ячейки
   */
  static extractCellMetadata(value, header, mergeInfo = null) {
      const metadata = {
          headerInfo: {
              level: header.level,
              parent: header.parent
          }
      };

      if (mergeInfo) {
          metadata.merge = {
              isMerged: true,
              isStart: mergeInfo.start.r === header.row && mergeInfo.start.c === header.column
          };
      }

      if (value !== null && value !== undefined) {
          const type = ExcelProcessor.determineCellType(value);
          
          switch (type) {
              case 'date':
                  metadata.format = ExcelProcessor.determineDateFormat(value);
                  break;
              case 'number':
                  metadata.precision = ExcelProcessor.determineNumericPrecision(value);
                  break;
              case 'percentage':
                  metadata.originalValue = parseFloat(value.toString().replace('%', '')) / 100;
                  break;
                  case 'currency':
                    metadata.currency = ExcelProcessor.extractCurrencySymbol(value);
                    metadata.originalValue = ExcelProcessor.extractNumericValue(value);
                    break;
                case 'formula':
                    metadata.originalFormula = value.toString();
                    break;
            }
        }

        return metadata;
    }

    /**
     * Определение формата даты
     * @param {*} value - Значение для анализа
     * @returns {string} - Формат даты
     */
    static determineDateFormat(value) {
        if (!value) return 'unknown';
        
        const strValue = value instanceof Date 
            ? value.toISOString()
            : value.toString().trim();

        if (/^\d{4}$/.test(strValue)) {
            return 'yearly';
        }
        
        if (/^\d{2}[./-]\d{4}$/.test(strValue)) {
            return 'monthly';
        }
        
        if (/^Q[1-4]\s*\d{4}$/i.test(strValue)) {
            return 'quarterly';
        }
        
        if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue) ||
            /^\d{4}-\d{2}-\d{2}/.test(strValue)) {
            return 'daily';
        }
        
        return 'unknown';
    }

    /**
     * Определение типа данных в ячейке
     * @param {*} value - Значение для анализа
     * @returns {string} - Тип данных
     */
    static determineCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }

        // Проверка на Excel serial number (дата)
        if (typeof value === 'number' && value > 25569 && value < 47483) {
            return 'date';
        }

        if (value instanceof Date) {
            return 'date';
        }

        const strValue = value.toString().trim();

        // Проверка на научную нотацию
        if (/^-?\d+\.?\d*e[+-]?\d+$/i.test(strValue)) {
            return 'number';
        }

        // Проверка на процент
        if (/^-?\d+([.,]\d+)?%$/.test(strValue)) {
            return 'percentage';
        }

        // Проверка на валюту
        if (/^[$€₽¥£]?\s*-?\d+([.,]\d+)?([kmbt])?$/i.test(strValue)) {
            return 'currency';
        }

        // Проверка на формулу
        if (strValue.startsWith('=')) {
            return 'formula';
        }

        // Проверка на дату
        if (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(strValue) ||
            /^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(strValue) ||
            /^Q[1-4]\s*\d{4}$/i.test(strValue)) {
            return 'date';
        }

        // Проверка на число
        if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
            return 'number';
        }

        return 'text';
    }

    // Добавить в utils/excelProcessor.js
  static extractTags(data, headers) {
    const tags = new Set();

   // Добавляем заголовки как теги
    headers.forEach(header => {
      const headerValue = header.value.toLowerCase();
      tags.add(headerValue);
      if (header.parent) {
          tags.add(header.parent.toLowerCase());
      }
    });

    // Анализируем данные
    data.forEach(row => {
      row.forEach(cell => {
          if (cell) {
              // Поиск годов
              const years = cell.toString().match(/\b(19|20)\d{2}\b/g);
              if (years) {
                  years.forEach(year => tags.add(year));
              }

              // Поиск ключевых слов
              if (typeof cell === 'string') {
                  const words = cell.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
                  if (words) {
                      words.forEach(word => tags.add(word.toLowerCase()));
                  }
              }

              // Добавляем типы данных как теги
              const cellType = this.determineCellType(cell);
              if (cellType !== 'empty' && cellType !== 'text') {
                  tags.add(cellType);
              }
          }
      });
  });

  return Array.from(tags);
}



    /**
     * Очистка значения ячейки
     * @param {*} value - Значение для очистки
     * @returns {*} - Очищенное значение
     */
    static sanitizeValue(value) {
        if (value === null || value === undefined) return '';
        
        if (value instanceof Date) {
            return value;
        }

        if (typeof value === 'number') {
            // Проверка на Excel serial number (дата)
            if (value > 25569 && value < 47483) {
                return ExcelProcessor.excelDateToJSDate(value);
            }
            // Обработка научной нотации
            if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e6) {
                return Number(value.toFixed(10));
            }
            return value;
        }

        const strValue = String(value).trim();

        // Обработка формул
        if (strValue.startsWith('=')) {
            return ExcelProcessor.evaluateFormula(strValue);
        }

        // Очистка специальных символов
        return strValue
            .replace(/<[^>]+>/g, '')           // Удаляем HTML
            .replace(/&[^;]+;/g, '')           // Удаляем HTML entities
            .replace(/[\u0000-\u001F]/g, '')   // Удаляем управляющие символы
            .replace(/[\u007F-\u009F]/g, '')   // Удаляем расширенные управляющие символы
            .trim();
    }

    /**
     * Безопасная обработка формул
     * @param {string} formula - Формула для обработки
     * @returns {string} - Обработанная формула
     */
    static evaluateFormula(formula) {
        const cleanFormula = formula.substring(1).trim();
        // В будущем здесь может быть добавлена безопасная обработка формул
        return cleanFormula;
    }

    /**
     * Определение точности числа
     * @param {number} value - Число для анализа
     * @returns {number} - Количество десятичных знаков
     */
    static determineNumericPrecision(value) {
        if (typeof value !== 'number') return 0;
        const str = value.toString();
        const decimals = str.includes('.') ? str.split('.')[1].length : 0;
        return decimals;
    }

    /**
     * Извлечение символа валюты
     * @param {string} value - Строка для анализа
     * @returns {string} - Символ валюты
     */
    static extractCurrencySymbol(value) {
        const match = value.toString().match(/^([₽$€¥£])/);
        return match ? match[1] : '';
    }

    /**
     * Извлечение числового значения
     * @param {string} value - Строка для анализа
     * @returns {number} - Числовое значение
     */
    static extractNumericValue(value) {
        return parseFloat(value.toString().replace(/[^-0-9.,]/g, '').replace(',', '.'));
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

    /**
     * Создание пустого блока
     * @param {string} sheetName - Название листа
     * @returns {Object} - Пустой блок данных
     */
    static createEmptyBlock(sheetName) {
        return {
            type: 'table',
            source: 'excel',
            content: {
                headers: [],
                rows: [],
                mergedCells: []
            },
            tags: [sheetName.toLowerCase()],
            metadata: {
                sheetName,
                rowCount: 0,
                columnCount: 0,
                totalCells: 0,
                hasMergedCells: false,
                dimensions: {
                    startRow: 0,
                    endRow: 0,
                    startCol: 0,
                    endCol: 0
                }
            }
        };
    }

    /**
     * Методы для обратной совместимости
     */
    static async process(filePath) {
        return ExcelProcessor.processFile(filePath);
    }

    async process(filePath) {
        return ExcelProcessor.processFile(filePath);
    }
}

module.exports = ExcelProcessor;





