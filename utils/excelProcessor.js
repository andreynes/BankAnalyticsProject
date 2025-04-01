// utils/excelProcessor.js

const ExcelParser = require('./excelParser');
const fs = require('fs');
const path = require('path');

class ExcelProcessor extends ExcelParser {
    constructor(options = {}) {
        super({
            preserveFormatting: true,
            detectTypes: true,
            extractMetadata: true,
            ...options
        });
    }

    /**
     * Статический метод для удобства использования
     */
    static async processFile(filePath, options = {}) {
        const processor = new ExcelProcessor(options);
        return processor.process(filePath);
    }

    /**
     * Обработка файла Excel
     */
    async process(filePath) {
        try {
            const result = await super.parse(filePath);
            const fileStats = fs.statSync(filePath);

            const blocks = [];
            const mainBlock = {
                type: 'table',
                content: {
                    headers: this.processHeaders(result.headers),
                    rows: this.processRows(result.data),
                    mergedCells: result.metadata.mergedCells || []
                },
                metadata: {
                    rowCount: result.data.length,
                    columnCount: result.headers.length,
                    types: this.analyzeColumnTypes(result.data),
                    fileSize: fileStats.size
                }
            };

            blocks.push(mainBlock);

            const tags = this.generateTags(result);

            return {
                fileName: path.basename(filePath),
                documentType: 'excel',
                blocks,
                tags,
                metadata: {
                    fileInfo: {
                        size: fileStats.size,
                        created: fileStats.birthtime,
                        modified: fileStats.mtime,
                        path: filePath,
                        name: path.basename(filePath),
                        fileSize: fileStats.size
                    },
                    processing: {
                        vertical: false,
                        totalRows: result.data.length + 1,
                        totalColumns: result.headers.length,
                        processedAt: new Date()
                    },
                    statistics: {
                        emptyRows: this.countEmptyRows(result.data),
                        dataCoverage: this.calculateDataCoverage(result.data),
                        typeDistribution: this.analyzeTypeDistribution(result.data)
                    }
                }
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found');
            }
            throw new Error(`Error processing file: ${error.message}`);
        }
    }

    /**
     * Обработка заголовков
     */
    processHeaders(headers) {
      if (!Array.isArray(headers)) return [];
      return headers.map(h => ({
          value: this.processValue(h),
          level: 1,
          metadata: this.extractMetadata(h)
      }));
  }

  /**
   * Обработка значения
   */
  processValue(value) {
      if (value === null || value === undefined) {
          return '';
      }

      // Обработка дат
      if (value instanceof Date) {
          return value.toISOString().split('T')[0];
      }

      // Обработка чисел
      if (typeof value === 'number') {
          if (Number.isInteger(value)) {
              return value;
          }
          // Проверка на Excel serial date
          if (value > 25569 && value < 47483) {
              return this.excelDateToJSDate(value);
          }
          return Number(value.toFixed(10)); // Сохраняем точность
      }

      const strValue = String(value).trim();

      // Обработка формул
      if (strValue.startsWith('=')) {
          return this.processFormula(strValue);
      }

      // Обработка HTML
      if (/<[^>]*>/.test(strValue)) {
          return strValue.replace(/<[^>]*>/g, '');
      }

      // Ограничение длины строки
      if (strValue.length > 1000) {
          return strValue.substring(0, 1000);
      }

      return strValue;
  }

  /**
   * Обработка строк данных
   */
  processRows(data) {
      if (!Array.isArray(data)) return [];
      
      return data.map((row, index) => {
          if (!row || !row.cells) return {
              rowNumber: index + 1,
              cells: new Map(),
              metadata: new Map()
          };

          const processedCells = new Map();
          
          for (const [key, value] of row.cells.entries()) {
              const processedValue = this.processValue(value.value);
              processedCells.set(key, {
                  value: processedValue,
                  type: this.determineCellType(processedValue),
                  metadata: this.extractMetadata(processedValue)
              });
          }

          return {
              rowNumber: index + 1,
              cells: processedCells,
              metadata: new Map([
                  ['isEmpty', this.isEmptyRow(row)],
                  ['hasFormulas', this.hasFormulas(row)],
                  ['types', this.getRowTypes(row)]
              ])
          };
      });
  }

  /**
   * Определение формата даты
   */
  determineDateFormat(value) {
      if (!value) return 'unknown';

      // Если это объект Date
      if (value instanceof Date) {
          return 'daily';
      }

      const strValue = String(value).trim();

      // Проверка на год
      if (/^\d{4}$/.test(strValue)) {
          return 'yearly';
      }

      // Проверка на месяц/год
      if (/^\d{2}[./-]\d{4}$/.test(strValue)) {
          return 'monthly';
      }

      // Проверка на полную дату
      if (/^\d{4}-\d{2}-\d{2}$/.test(strValue) ||
          /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue)) {
          return 'daily';
      }

      // Проверка на Excel serial date
      if (typeof value === 'number' && value > 25569 && value < 47483) {
          return 'daily';
      }

      return 'unknown';
  }

  /**
   * Определение точности числа
   */
  determineNumericPrecision(value) {
      if (typeof value !== 'number') {
          const num = parseFloat(value);
          if (isNaN(num)) return 0;
          value = num;
      }
      const str = value.toString();
      return str.includes('.') ? str.split('.')[1].length : 0;
  }

    /**
     * Извлечение метаданных
     */
    extractMetadata(value) {
      const metadata = {
          precision: 0,
          format: 'unknown',
          hasSpecialChars: false,
          hasUnicode: false
      };

      try {
          if (value === null || value === undefined) {
              return metadata;
          }

          const type = this.determineCellType(value);
          
          switch (type) {
              case 'date':
                  metadata.format = this.determineDateFormat(value);
                  metadata.timestamp = value instanceof Date ? value.getTime() : null;
                  break;
                  
              case 'number':
                  metadata.precision = this.determineNumericPrecision(value);
                  metadata.isScientific = /e[+-]?\d+$/i.test(String(value));
                  break;
                  
              case 'percentage':
                  const numValue = parseFloat(String(value).replace('%', ''));
                  metadata.originalValue = numValue / 100;
                  metadata.precision = this.determineNumericPrecision(numValue);
                  break;
                  
              case 'currency':
                  const currencyMatch = String(value).match(/[₽$€¥£]/);
                  metadata.currency = currencyMatch ? currencyMatch[0] : '';
                  const cleanValue = String(value).replace(/[₽$€¥£,]/g, '');
                  metadata.originalValue = parseFloat(cleanValue);
                  metadata.precision = this.determineNumericPrecision(metadata.originalValue);
                  break;
                  
              case 'text':
                  metadata.length = String(value).length;
                  metadata.hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(String(value));
                  metadata.hasUnicode = /[^\u0000-\u007f]/.test(String(value));
                  break;
          }
      } catch (error) {
          console.error('Error extracting metadata:', error);
      }

      return metadata;
  }

  /**
   * Обработка формулы
   */
  processFormula(formula) {
      if (!formula.startsWith('=')) {
          return formula;
      }

      try {
          return formula.substring(1).replace(/[<>]|javascript:|data:/gi, '').trim();
      } catch (error) {
          console.error('Error processing formula:', error);
          return '';
      }
  }

  /**
   * Проверка на пустую строку
   */
  isEmptyRow(row) {
      if (!row || !row.cells) return true;
      return Array.from(row.cells.values())
          .every(cell => !cell.value || String(cell.value).trim() === '');
  }

  /**
   * Проверка на наличие формул
   */
  hasFormulas(row) {
      if (!row || !row.cells) return false;
      return Array.from(row.cells.values())
          .some(cell => cell.value && String(cell.value).startsWith('='));
  }

  /**
   * Получение типов данных в строке
   */
  getRowTypes(row) {
      if (!row || !row.cells) return new Set();
      return new Set(
          Array.from(row.cells.values())
              .map(cell => this.determineCellType(cell.value))
              .filter(type => type !== 'empty')
      );
  }

  /**
   * Анализ типов столбцов
   */
  analyzeColumnTypes(data) {
      const columnTypes = new Map();
      
      if (!Array.isArray(data) || !data.length) return columnTypes;

      data.forEach(row => {
          if (!row || !row.cells) return;
          
          for (const [header, cell] of row.cells.entries()) {
              if (!columnTypes.has(header)) {
                  columnTypes.set(header, new Set());
              }
              columnTypes.get(header).add(this.determineCellType(cell.value));
          }
      });

      // Определяем преобладающий тип для каждого столбца
      for (const [header, types] of columnTypes.entries()) {
          columnTypes.set(header, this.getDominantType(Array.from(types)));
      }

      return columnTypes;
  }

  /**
   * Генерация тегов для данных
   */
  generateTags(data) {
      const tags = new Set();

      if (!data) return [];

      // Добавляем теги из заголовков
      if (Array.isArray(data.headers)) {
          data.headers.forEach(header => {
              if (header) {
                  tags.add(String(header).toLowerCase());
              }
          });
      }

      // Добавляем теги из данных
      if (Array.isArray(data.data)) {
          data.data.forEach(row => {
              if (!row.cells) return;
              row.cells.forEach((cell, header) => {
                  if (cell && cell.value) {
                      const value = String(cell.value);

                      // Добавляем годы
                      const years = value.match(/\b(19|20)\d{2}\b/g);
                      if (years) {
                          years.forEach(year => tags.add(year));
                      }

                      // Добавляем бизнес-метрики
                      const metrics = ['revenue', 'profit', 'margin', 'growth', 'sales'];
                      metrics.forEach(metric => {
                          if (value.toLowerCase().includes(metric)) {
                              tags.add(metric);
                          }
                      });

                      // Добавляем заголовок как тег
                      if (header) {
                          tags.add(String(header).toLowerCase());
                      }
                  }
              });
          });
      }

      return Array.from(tags);
  }

  /**
   * Получение преобладающего типа
   */
  getDominantType(types) {
      if (!Array.isArray(types) || !types.length) return 'text';

      const typeCounts = types.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
      }, {});

      return Object.entries(typeCounts)
          .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  /**
   * Подсчет пустых строк
   */
  countEmptyRows(data) {
      if (!Array.isArray(data)) return 0;
      return data.filter(row => this.isEmptyRow(row)).length;
  }

  /**
   * Расчет покрытия данными
   */
  calculateDataCoverage(data) {
      if (!Array.isArray(data) || !data.length) return 0;

      let totalCells = 0;
      let nonEmptyCells = 0;

      data.forEach(row => {
          if (!row.cells) return;
          const cells = Array.from(row.cells.values());
          totalCells += cells.length;
          nonEmptyCells += cells.filter(cell => 
              cell.value !== null && 
              cell.value !== undefined && 
              String(cell.value).trim() !== ''
          ).length;
      });

      return totalCells ? (nonEmptyCells / totalCells) * 100 : 0;
  }

  /**
   * Анализ распределения типов данных
   */
  analyzeTypeDistribution(data) {
      const distribution = {
          empty: 0,
          number: 0,
          text: 0,
          date: 0,
          percentage: 0,
          currency: 0
      };

      if (!Array.isArray(data)) return distribution;

      data.forEach(row => {
          if (!row.cells) return;
          Array.from(row.cells.values()).forEach(cell => {
              const type = this.determineCellType(cell.value);
              distribution[type] = (distribution[type] || 0) + 1;
          });
      });

      return distribution;
  }
}

module.exports = ExcelProcessor;




