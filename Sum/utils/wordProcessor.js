// utils/wordProcessor.js

const BaseDataProcessor = require('./baseDataProcessor');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

class WordProcessor extends BaseDataProcessor {
    constructor(options = {}) {
        super({
            supportedFormats: ['.docx', '.doc'],
            tableExtraction: true,
            preserveFormatting: true,
            ...options
        });
    }

    /**
     * Обработка Word документа
     * @param {string|Object} options - Путь к файлу или объект с опциями
     * @returns {Promise<Object>} - Обработанные данные
     */
    async process(options) {
        let filePath;
        if (typeof options === 'string') {
            filePath = options;
        } else if (options && options.filePath) {
            filePath = options.filePath;
        } else {
            throw new Error('Invalid file format: File path is required');
        }

        try {
            await this.validateFile(filePath);

            const result = {
                fileName: path.basename(filePath),
                documentType: 'word',
                globalTags: new Set(),
                blocks: [],
                metadata: {
                    statistics: {
                        fileSize: (await fs.stat(filePath)).size,
                        totalBlocks: 0,
                        textBlocks: 0,
                        tableBlocks: 0,
                        processedAt: new Date()
                    }
                }
            };

            // Извлекаем содержимое с сохранением форматирования
            const { value: content, messages } = await mammoth.extractRawText({
                path: filePath,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "table => table:fresh"
                ]
            });

            if (!content || !content.trim()) {
                return this.createEmptyResult(filePath);
            }

            // Извлекаем таблицы отдельно для сохранения структуры
            const { value: htmlContent } = await mammoth.convertToHtml({
                path: filePath,
                transformDocument: this.transformDocument.bind(this)
            });

            // Обработка текстовых блоков
            const textBlocks = await this.extractTextBlocks(content);
            for (const block of textBlocks) {
                const processedBlock = await this.processTextBlock(block);
                if (processedBlock) {
                    result.blocks.push(processedBlock);
                    if (processedBlock.tags) {
                        processedBlock.tags.forEach(tag => result.globalTags.add(tag));
                    }
                }
            }

            // Обработка таблиц
            const tables = this.extractTablesFromHtml(htmlContent);
            for (const table of tables) {
                const tableBlock = await this.processTableBlock(table);
                if (tableBlock) {
                    result.blocks.push(tableBlock);
                    if (tableBlock.tags) {
                        tableBlock.tags.forEach(tag => result.globalTags.add(tag));
                    }
                }
            }

            // Обновляем статистику
            result.metadata.statistics.totalBlocks = result.blocks.length;
            result.metadata.statistics.textBlocks = result.blocks.filter(b => b.type === 'text' || b.type === 'heading').length;
            result.metadata.statistics.tableBlocks = result.blocks.filter(b => b.type === 'table').length;

            // Добавляем метаданные документа
            result.metadata.documentProperties = await this.extractDocumentProperties(filePath);

            // Преобразуем Set в Array для тегов
            result.globalTags = Array.from(result.globalTags);

            return result;

        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found: ' + filePath);
            }
            if (error.message.includes('Unsupported file type')) {
                throw new Error('Unsupported file type: ' + path.extname(filePath));
            }
            throw new Error(`Processing error: ${error.message}`);
        }
    }

    /**
     * Извлечение текстовых блоков
     * @param {string} content - Содержимое документа
     * @returns {Promise<Array>} - Массив текстовых блоков
     */
    async extractTextBlocks(content) {
        const blocks = [];
        let currentBlock = {
            type: 'text',
            content: '',
            level: 0
        };

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                if (currentBlock.content) {
                    blocks.push({ ...currentBlock });
                    currentBlock.content = '';
                }
                continue;
            }

            const headingLevel = this.getHeadingLevel(trimmedLine);
            if (headingLevel) {
                if (currentBlock.content) {
                    blocks.push({ ...currentBlock });
                }
                currentBlock = {
                    type: 'heading',
                    content: trimmedLine,
                    level: headingLevel
                };
                blocks.push({ ...currentBlock });
                currentBlock = {
                    type: 'text',
                    content: '',
                    level: 0
                };
            } else {
                if (currentBlock.content) {
                    currentBlock.content += ' ';
                }
                currentBlock.content += trimmedLine;
            }
        }

        if (currentBlock.content) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    /**
     * Получение уровня заголовка
     * @param {string} text - Текст для анализа
     * @returns {number} - Уровень заголовка
     */
    getHeadingLevel(text) {
        if (/^h[1-6]/.test(text)) {
            return parseInt(text[1]);
        }
        if (/^[A-ZА-Я\s]{5,}$/.test(text)) {
            return 1;
        }
        return 0;
    }

    /**
     * Определение размера текста
     * @param {string} content - Текст для анализа
     * @returns {string} - Размер текста
     */
    determineTextSize(content) {
        if (/^h1/.test(content)) return 'large';
        if (/^h[23]/.test(content)) return 'medium';
        if (/^h[456]/.test(content)) return 'small';
        return 'normal';
    }

    /**
     * Определение выравнивания
     * @param {string} content - Текст для анализа
     * @returns {string} - Тип выравнивания
     */
    determineAlignment(content) {
        if (content.startsWith('>')) return 'right';
        if (content.startsWith('<')) return 'left';
        if (content.startsWith('|')) return 'center';
        return 'left';
    }

    /**
     * Обработка текстового блока
     * @param {Object} block - Текстовый блок
     * @returns {Promise<Object>} - Обработанный блок
     */
    async processTextBlock(block) {
        const formatting = {
            bold: block.content.includes('**') || block.type === 'heading',
            italic: block.content.includes('_'),
            size: block.type === 'heading' ? 'large' : this.determineTextSize(block.content),
            alignment: this.determineAlignment(block.content)
        };

        return {
            type: block.type,
            content: {
                text: block.content,
                level: block.level,
                paragraphs: block.content.split('\n').filter(p => p.trim()),
                formatting
            },
            tags: Array.from(this.extractTags(block.content))
        };
    }

    /**
     * Извлечение таблиц из HTML
     * @param {string} html - HTML-содержимое
     * @returns {Array} - Массив таблиц
     */
    extractTablesFromHtml(html) {
        const tables = [];
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let match;

        while ((match = tableRegex.exec(html)) !== null) {
            const tableHtml = match[0];
            const rows = this.extractRowsFromTableHtml(tableHtml);
            if (rows.length > 0) {
                tables.push({
                    rows,
                    html: tableHtml
                });
            }
        }

        return tables;
    }

    /**
     * Извлечение строк из HTML таблицы
     * @param {string} tableHtml - HTML таблицы
     * @returns {Array} - Массив строк
     */
    extractRowsFromTableHtml(tableHtml) {
        const rows = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let match;

        while ((match = rowRegex.exec(tableHtml)) !== null) {
            const cells = this.extractCellsFromRowHtml(match[1]);
            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        return rows;
    }

    /**
     * Извлечение ячеек из HTML строки
     * @param {string} rowHtml - HTML строки
     * @returns {Array} - Массив ячеек
     */
    extractCellsFromRowHtml(rowHtml) {
      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let match;

      while ((match = cellRegex.exec(rowHtml)) !== null) {
          const cellContent = match[1].replace(/<[^>]+>/g, '').trim();
          const cellHtml = match[0];
          
          cells.push({
              content: cellContent,
              rowSpan: parseInt((cellHtml.match(/rowspan="(\d+)"/) || [])[1] || 1),
              colSpan: parseInt((cellHtml.match(/colspan="(\d+)"/) || [])[1] || 1),
              isHeader: cellHtml.startsWith('<th')
          });
      }

      return cells;
  }

  /**
   * Обработка блока таблицы
   * @param {Object} table - Таблица
   * @returns {Promise<Object>} - Обработанный блок
   */
  async processTableBlock(table) {
      if (!table.rows || !table.rows[0]) {
          return null;
      }

      const headers = this.extractTableHeaders(table);
      const rows = this.extractTableRows(table, headers);
      const mergedCells = this.extractMergedCells(table);

      const tags = new Set();
      headers.forEach(header => tags.add(header.toLowerCase()));
      rows.forEach(row => {
          Object.values(row).forEach(cell => {
              if (cell && cell.value) {
                  this.extractTags(cell.value.toString()).forEach(tag => tags.add(tag));
              }
          });
      });

      return {
          type: 'table',
          content: {
              headers: headers.map(h => ({ value: h, level: 1 })),
              rows: rows.map((row, index) => ({
                  rowNumber: index + 1,
                  cells: new Map(Object.entries(row)),
                  metadata: new Map()
              })),
              mergedCells
          },
          tags: Array.from(tags)
      };
  }

  /**
   * Извлечение заголовков таблицы
   * @param {Object} table - Таблица
   * @returns {Array} - Заголовки
   */
  extractTableHeaders(table) {
      if (!table.rows || !table.rows[0]) return [];
      
      return table.rows[0]
          .filter(cell => cell.isHeader || table.rows[0].every(c => c.isHeader))
          .map(cell => cell.content.trim())
          .filter(header => header !== '');
  }

  /**
   * Извлечение строк таблицы
   * @param {Object} table - Таблица
   * @param {Array} headers - Заголовки
   * @returns {Array} - Строки
   */
  extractTableRows(table, headers) {
      if (!table.rows || table.rows.length < 2) return [];

      return table.rows.slice(1).map(row => {
          const rowData = {};
          row.forEach((cell, index) => {
              if (headers[index]) {
                  rowData[headers[index]] = {
                      value: cell.content.trim(),
                      type: this.determineCellType(cell.content)
                  };
              }
          });
          return rowData;
      });
  }

  /**
   * Извлечение объединенных ячеек
   * @param {Object} table - Таблица
   * @returns {Array} - Информация об объединенных ячейках
   */
  extractMergedCells(table) {
      const mergedCells = [];

      if (!table.rows) return mergedCells;

      table.rows.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
              if (cell.rowSpan > 1 || cell.colSpan > 1) {
                  mergedCells.push({
                      start: { row: rowIndex, col: colIndex },
                      end: {
                          row: rowIndex + cell.rowSpan - 1,
                          col: colIndex + cell.colSpan - 1
                      },
                      content: cell.content
                  });
              }
          });
      });

      return mergedCells;
  }

  /**
   * Извлечение тегов из текста
   * @param {string} text - Текст для анализа
   * @returns {Set} - Набор тегов
   */
  extractTags(text) {
      const tags = new Set();

      if (!text) return tags;

      // Извлекаем годы
      const years = text.match(/\b(19|20)\d{2}\b/g);
      if (years) {
          years.forEach(year => tags.add(year));
      }

      // Извлекаем ключевые слова
      const words = text.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
      if (words) {
          words.forEach(word => tags.add(word.toLowerCase()));
      }

      // Извлекаем бизнес-метрики
      const metrics = text.match(/\b(Revenue|Profit|Margin|Growth)\b/gi);
      if (metrics) {
          metrics.forEach(metric => tags.add(metric.toLowerCase()));
      }

      return tags;
  }

  /**
   * Извлечение свойств документа
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Object>} - Свойства документа
   */
  async extractDocumentProperties(filePath) {
      const stats = await fs.stat(filePath);
      return {
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size,
          extension: path.extname(filePath)
      };
  }

  /**
   * Валидация файла
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<boolean>} - Результат валидации
   */
  async validateFile(filePath) {
      try {
          const stats = await fs.stat(filePath);
          if (stats.size === 0) {
              throw new Error('File is empty');
          }

          const ext = path.extname(filePath).toLowerCase();
          if (!this.options.supportedFormats.includes(ext)) {
              throw new Error(`Unsupported file type: ${ext}`);
          }

          return true;
      } catch (error) {
          if (error.code === 'ENOENT') {
              throw new Error('File not found');
          }
          throw error;
      }
  }

  /**
   * Создание пустого результата
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Object>} - Пустой результат
   */
  async createEmptyResult(filePath) {
      const stats = await fs.stat(filePath);
      return {
          fileName: path.basename(filePath),
          documentType: 'word',
          blocks: [],
          globalTags: [],
          metadata: {
              statistics: {
                  fileSize: stats.size,
                  totalBlocks: 0,
                  textBlocks: 0,
                  tableBlocks: 0,
                  processedAt: new Date()
              },
              documentProperties: {
                  created: stats.birthtime,
                  modified: stats.mtime,
                  size: stats.size,
                  extension: path.extname(filePath)
              }
          }
      };
  }

  /**
   * Очистка ресурсов
   * @param {string} filePath - Путь к файлу
   */
  async cleanup(filePath) {
      try {
          const tempDir = path.join(path.dirname(filePath), '.temp');
          if (await fs.access(tempDir).then(() => true).catch(() => false)) {
              await fs.rm(tempDir, { recursive: true, force: true });
          }
      } catch (error) {
          console.warn('Warning: Cleanup error:', error.message);
      }
  }
}

module.exports = WordProcessor;





