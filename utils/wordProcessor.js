// utils/wordProcessor.js

const BaseDataProcessor = require('./baseDataProcessor');
const mammoth = require('mammoth');
const fs = require('fs');
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
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Object>} - Обработанные данные
   */
  async process(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found: " + filePath);
    }

    const extension = path.extname(filePath).toLowerCase();
    if (!this.options.supportedFormats.includes(extension)) {
      throw new Error("Unsupported file type: " + extension);
    }

    try {
      const { value: content, messages } = await mammoth.extractRawText({
        path: filePath,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh"
        ]
      });

      const result = {
        fileName: path.basename(filePath),
        documentType: 'word',
        globalTags: new Set(),
        blocks: [],
        metadata: {
          statistics: {
            fileSize: fs.statSync(filePath).size,
            totalBlocks: 0,
            textBlocks: 0,
            tableBlocks: 0
          },
          documentProperties: await this.extractDocumentProperties(filePath)
        }
      };

      // Извлекаем таблицы
      const tables = await this.extractTables(filePath);
      
      // Разбиваем контент на блоки
      const textBlocks = await this.splitIntoBlocks(content);

      // Обрабатываем текстовые блоки
      for (const block of textBlocks) {
        const processedBlock = await this.processTextBlock(block);
        if (processedBlock) {
          result.blocks.push(processedBlock);
          processedBlock.tags.forEach(tag => result.globalTags.add(tag));
        }
      }

      // Обрабатываем таблицы
      for (const table of tables) {
        const tableBlock = await this.processTableBlock(table);
        if (tableBlock) {
          result.blocks.push(tableBlock);
          tableBlock.tags.forEach(tag => result.globalTags.add(tag));
        }
      }

      // Обновляем статистику
      result.metadata.statistics.totalBlocks = result.blocks.length;
      result.metadata.statistics.textBlocks = result.blocks.filter(b => b.type === 'text').length;
      result.metadata.statistics.tableBlocks = result.blocks.filter(b => b.type === 'table').length;
      result.globalTags = Array.from(result.globalTags);

      return result;

    } catch (error) {
      throw new Error(`Invalid file format: ${error.message}`);
    }
  }

  /**
   * Извлечение свойств документа
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Object>} - Свойства документа
   */
  async extractDocumentProperties(filePath) {
    const stats = fs.statSync(filePath);
    return {
      created: stats.birthtime,
      modified: stats.mtime,
      size: stats.size
    };
  }

  /**
   * Разделение на блоки
   * @param {string} content - Содержимое документа
   * @returns {Promise<Array>} - Массив блоков
   */
  async splitIntoBlocks(content) {
    const blocks = [];
    let currentBlock = '';
    const lines = content.split('\n');

    for (const line of lines) {
      if (this.isNewBlockStart(line)) {
        if (currentBlock) {
          blocks.push(currentBlock.trim());
        }
        currentBlock = line;
      } else {
        currentBlock += '\n' + line;
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock.trim());
    }

    return blocks;
  }

  /**
   * Определение начала нового блока
   * @param {string} line - Строка для проверки
   * @returns {boolean} - Является ли строка началом блока
   */
  isNewBlockStart(line) {
    return (
      /^[1-9]\.\s/.test(line) || // Нумерованный список
      /^[A-ZА-Я][\sA-ZА-Я]{2,}/.test(line) || // Заголовок заглавными буквами
      /^(Таблица|Table)\s+\d+/.test(line) || // Таблица
      /^h[1-6]/.test(line) // HTML заголовок
    );
  }

  /**
   * Обработка текстового блока
   * @param {string} content - Содержимое блока
   * @returns {Promise<Object>} - Обработанный блок
   */
  async processTextBlock(content) {
    const isHeading = /^h[1-6]/.test(content);
    const tags = this.extractTags(content);

    return {
      type: 'text',
      content: {
        text: content,
        paragraphs: content.split('\n').filter(p => p.trim()),
        isHeading,
        level: isHeading ? parseInt(content.charAt(1)) : 0
      },
      tags: Array.from(tags),
      formatting: this.extractFormatting(content)
    };
  }

  /**
   * Извлечение таблиц
   * @param {string} filePath - Путь к файлу
   * @returns {Promise<Array>} - Массив таблиц
   */
  async extractTables(filePath) {
    const { value } = await mammoth.extractRawText({
      path: filePath,
      includeDefaultStyleMap: true,
      transformDocument: this.tableTransform
    });

    return value.tables || [];
  }

  /**
   * Трансформация таблиц
   * @param {Object} element - Элемент документа
   */
  tableTransform(element) {
    if (element.type === 'table') {
      return {
        type: 'table',
        children: element.children.map(row => ({
          type: 'row',
          children: row.children.map(cell => ({
            type: 'cell',
            content: cell.children,
            mergeInfo: cell.mergeInfo
          }))
        }))
      };
    }
  }

  /**
   * Обработка блока таблицы
   * @param {Object} table - Таблица
   * @returns {Promise<Object>} - Обработанный блок
   */
  async processTableBlock(table) {
    if (!table || !table.children || table.children.length === 0) {
        return null;
    }
    
    const headers = this.extractTableHeaders(table);
    const rows = this.extractTableRows(table, headers);
    const mergedCells = this.extractMergedCells(table);
    const tags = this.extractTableTags(headers, rows);

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
    if (!table.children || !table.children[0]) return [];
    return table.children[0].children.map(cell => 
      cell.content.map(c => c.text).join(' ').trim()
    );
  }

  /**
   * Извлечение строк таблицы
   * @param {Object} table - Таблица
   * @param {Array} headers - Заголовки
   * @returns {Array} - Строки
   */
  extractTableRows(table, headers) {
    if (!table.children) return [];
    return table.children.slice(1).map(row => {
      const rowData = {};
      row.children.forEach((cell, index) => {
        if (headers[index]) {
          rowData[headers[index]] = {
            value: cell.content.map(c => c.text).join(' ').trim(),
            type: this.determineCellType(cell.content.map(c => c.text).join(' ').trim())
          };
        }
      });
      return rowData;
    });
  }

 // Продолжение класса WordProcessor

  /**
   * Извлечение объединенных ячеек (продолжение)
   */
  extractMergedCells(table) {
    const mergedCells = [];
    if (!table.children) return mergedCells;

    table.children.forEach((row, rowIndex) => {
      row.children.forEach((cell, colIndex) => {
        if (cell.mergeInfo) {
          mergedCells.push({
            row: rowIndex,
            col: colIndex,
            rowSpan: cell.mergeInfo.rowSpan || 1,
            colSpan: cell.mergeInfo.colSpan || 1
          });
        }
      });
    });

    return mergedCells;
  }

  /**
   * Извлечение тегов из таблицы
   * @param {Array} headers - Заголовки таблицы
   * @param {Array} rows - Строки таблицы
   * @returns {Set} - Набор тегов
   */
  extractTableTags(headers, rows) {
    const tags = new Set();

    // Добавляем заголовки как теги
    headers.forEach(header => tags.add(header.toLowerCase()));

    // Анализируем содержимое ячеек
    rows.forEach(row => {
      Object.values(row).forEach(cell => {
        if (cell && cell.value) {
          this.extractTags(cell.value.toString()).forEach(tag => tags.add(tag));
        }
      });
    });

    return tags;
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

    // Извлекаем финансовые показатели
    const metrics = text.match(/\b(Revenue|Profit|Margin|Growth)\b/gi);
    if (metrics) {
      metrics.forEach(metric => tags.add(metric.toLowerCase()));
    }

    return tags;
  }

  /**
   * Извлечение форматирования
   * @param {string} content - Содержимое для анализа
   * @returns {Object} - Информация о форматировании
   */
  extractFormatting(content) {
    return {
      bold: /\*\*(.*?)\*\*/g.test(content) || /^h[1-3]/.test(content),
      italic: /_(.*?)_/g.test(content),
      size: this.determineTextSize(content),
      alignment: this.determineAlignment(content)
    };
  }

  /**
   * Определение размера текста
   * @param {string} content - Содержимое для анализа
   * @returns {string} - Размер текста
   */
  determineTextSize(content) {
    if (/^h1/.test(content)) return 'large';
    if (/^h[23]/.test(content)) return 'medium';
    return 'normal';
  }

  /**
   * Определение выравнивания
   * @param {string} content - Содержимое для анализа
   * @returns {string} - Тип выравнивания
   */
  determineAlignment(content) {
    if (/^:.*:$/.test(content)) return 'center';
    if (/^:/.test(content)) return 'left';
    if (/:$/.test(content)) return 'right';
    return 'left';
  }

  /**
   * Валидация файла
   * @param {string} filePath - Путь к файлу
   * @returns {boolean} - Результат валидации
   */
  validateFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found: " + filePath);
    }

    const extension = path.extname(filePath).toLowerCase();
    if (!this.options.supportedFormats.includes(extension)) {
      throw new Error("Unsupported file type: " + extension);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("File is empty");
    }

    return true;
  }

  /**
   * Очистка временных файлов
   * @param {string} filePath - Путь к файлу
   */
  cleanup(filePath) {
    try {
      const tempDir = path.join(path.dirname(filePath), '.temp');
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Warning: Error during cleanup:', error.message);
    }
  }
}

module.exports = WordProcessor;


