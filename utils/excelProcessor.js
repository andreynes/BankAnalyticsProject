// utils/excelProcessor.js

const BaseDataProcessor = require('./baseDataProcessor');
const xlsx = require('xlsx');
const fs = require('fs');

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
      dateNF: 'yyyy-mm-dd'
    });

    const result = {
      fileName: filePath.split('/').pop(),
      documentType: 'excel',
      globalTags: new Set(),
      blocks: [],
      metadata: {
        statistics: {
          fileSize: fs.statSync(filePath).size,
          sheets: workbook.SheetNames.length
        }
      }
    };

    // Обработка каждого листа как отдельного блока
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const block = await ExcelProcessor.processWorksheet(worksheet, sheetName);
      result.blocks.push(block);
      
      // Добавление тегов листа в глобальные теги
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
    const rawData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false
    });

    if (!rawData.length) {
      return ExcelProcessor.createEmptyBlock(sheetName);
    }

    const structure = ExcelProcessor.analyzeWorksheetStructure(rawData);
    const content = {
      headers: structure.headers,
      rows: structure.rows.map((row, index) => ({
        rowNumber: index + 1,
        cells: new Map(Object.entries(row)),
        metadata: new Map()
      }))
    };

    const tags = ExcelProcessor.extractTags(rawData, structure.headers);

    return {
      type: 'table',
      source: 'excel',
      content: content,
      tags: Array.from(tags),
      metadata: {
        sheetName,
        rowCount: content.rows.length,
        columnCount: structure.headers.length
      }
    };
  }

  /**
   * Анализ структуры листа Excel
   * @param {Array} rawData - Сырые данные листа
   * @returns {Object} - Структура данных листа
   */
  static analyzeWorksheetStructure(rawData) {
    const headerRows = ExcelProcessor.detectHeaderRows(rawData);
    const dataRows = rawData.slice(headerRows.length);

    return {
      headers: ExcelProcessor.processHeaders(headerRows),
      rows: ExcelProcessor.processDataRows(dataRows, headerRows)
    };
  }

  /**
   * Определение строк заголовков
   * @param {Array} data - Данные листа
   * @returns {Array} - Строки заголовков
   */
  static detectHeaderRows(data) {
    const headerRows = [];
    for (let i = 0; i < data.length; i++) {
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
    return row.some(cell => 
      cell && 
      typeof cell === 'string' && 
      cell.trim() !== '' &&
      !/^\d+([.,]\d+)?$/.test(cell.trim())
    );
  }

  /**
   * Обработка заголовков
   * @param {Array} headerRows - Строки заголовков
   * @returns {Array} - Обработанные заголовки
   */
  static processHeaders(headerRows) {
    if (!headerRows.length) return [];

    const headers = [];
    const processedCells = new Set();

    headerRows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell || processedCells.has(`${rowIndex}-${colIndex}`)) return;

        const span = ExcelProcessor.getHeaderSpan(headerRows, rowIndex, colIndex);
        processedCells.add(`${rowIndex}-${colIndex}`);

        headers.push({
          value: cell.toString().trim(),
          level: rowIndex + 1,
          span: span
        });
      });
    });

    return headers;
  }

  /**
   * Определение размера объединенной ячейки заголовка
   * @param {Array} headerRows - Строки заголовков
   * @param {number} rowIndex - Индекс строки
   * @param {number} colIndex - Индекс колонки
   * @returns {Object} - Размер объединенной ячейки
   */
  static getHeaderSpan(headerRows, rowIndex, colIndex) {
    let rowSpan = 1;
    let colSpan = 1;

    while (rowIndex + rowSpan < headerRows.length &&
           (!headerRows[rowIndex + rowSpan][colIndex] ||
            headerRows[rowIndex + rowSpan][colIndex] === headerRows[rowIndex][colIndex])) {
      rowSpan++;
    }

    while (colIndex + colSpan < headerRows[rowIndex].length &&
           (!headerRows[rowIndex][colIndex + colSpan] ||
            headerRows[rowIndex][colIndex + colSpan] === headerRows[rowIndex][colIndex])) {
      colSpan++;
    }

    return { rowSpan, colSpan };
  }

  /**
   * Обработка строк данных
   * @param {Array} dataRows - Строки данных
   * @param {Array} headerRows - Строки заголовков
   * @returns {Array} - Обработанные данные
   */
  static processDataRows(dataRows, headerRows) {
    const headers = ExcelProcessor.processHeaders(headerRows);
    return dataRows.map(row => {
      const processedRow = {};
      row.forEach((cell, index) => {
        if (headers[index]) {
          processedRow[headers[index].value] = {
            value: ExcelProcessor.sanitizeValue(cell),
            type: ExcelProcessor.determineCellType(cell)
          };
        }
      });
      return processedRow;
    });
  }

  /**
   * Очистка значения ячейки
   * @param {*} value - Значение для очистки
   * @returns {*} - Очищенное значение
   */
  static sanitizeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    return value.toString().trim();
  }

  /**
   * Извлечение тегов из данных
   * @param {Array} data - Данные для анализа
   * @param {Array} headers - Заголовки
   * @returns {Set} - Набор тегов
   */
  static extractTags(data, headers) {
    const tags = new Set();

    // Добавляем заголовки как теги
    headers.forEach(header => {
      tags.add(header.value.toLowerCase());
    });

    // Ищем годы и другие значимые данные
    data.forEach(row => {
      row.forEach(cell => {
        if (cell) {
          // Поиск годов
          const years = cell.toString().match(/\b(19|20)\d{2}\b/g);
          if (years) {
            years.forEach(year => tags.add(year));
          }

          // Добавление других значимых слов
          if (typeof cell === 'string') {
            const words = cell.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
            if (words) {
              words.forEach(word => tags.add(word.toLowerCase()));
            }
          }
        }
      });
    });

    return tags;
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
        rows: []
      },
      tags: [sheetName.toLowerCase()],
      metadata: {
        sheetName,
        rowCount: 0,
        columnCount: 0
      }
    };
  }

  /**
   * Метод для обратной совместимости
   */
  static async process(filePath) {
    return ExcelProcessor.processFile(filePath);
  }

  /**
   * Метод для обратной совместимости
   */
  async process(filePath) {
    return ExcelProcessor.processFile(filePath);
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

    if (typeof value === 'number') {
      return 'number';
    }

    if (value instanceof Date) {
      return 'date';
    }

    const strValue = value.toString().trim();

    // Проверка на дату
    if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue) || 
        /^\d{4}[./-]\d{2}[./-]\d{2}$/.test(strValue)) {
      return 'date';
    }

    // Проверка на процент
    if (/^-?\d+([.,]\d+)?%$/.test(strValue)) {
      return 'percentage';
    }

    // Проверка на число
    if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
      return 'number';
    }

    // Проверка на валюту
    if (/^[$€₽]?\s*-?\d+([.,]\d+)?([kmbt])?$/i.test(strValue)) {
      return 'currency';
    }

    return 'text';
  }

  /**
   * Форматирование значения ячейки
   * @param {*} value - Значение для форматирования
   * @param {string} type - Тип данных
   * @returns {*} - Отформатированное значение
   */
  static formatCellValue(value, type) {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value.replace(',', '.'));
      
      case 'percentage':
        return parseFloat(value.replace('%', '').replace(',', '.')) / 100;
      
      case 'currency':
        return parseFloat(value.replace(/[^-0-9.,]/g, '').replace(',', '.'));
      
      case 'date':
        return value instanceof Date ? value : new Date(value);
      
      default:
        return value.toString().trim();
    }
  }

  /**
   * Валидация данных
   * @param {Object} data - Данные для валидации
   * @returns {boolean} - Результат валидации
   */
  static validateData(data) {
    if (!data || !Array.isArray(data.blocks)) {
      return false;
    }

    return data.blocks.every(block => {
      if (block.type !== 'table') return false;
      if (!block.content || !Array.isArray(block.content.headers)) return false;
      if (!Array.isArray(block.content.rows)) return false;
      return true;
    });
  }

  /**
   * Извлечение метаданных
   * @param {string} filePath - Путь к файлу
   * @returns {Object} - Метаданные файла
   */
  static extractMetadata(filePath) {
    const stats = fs.statSync(filePath);
    return {
      fileName: path.basename(filePath),
      fileSize: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(filePath).toLowerCase()
    };
  }

  /**
   * Определение формата даты
   * @param {Array} dates - Массив дат
   * @returns {string} - Формат даты
   */
  static determineDateFormat(dates) {
    if (!dates || !dates.length) return 'unknown';

    const firstDate = dates[0].toString();

    if (/^\d{4}$/.test(firstDate)) {
      return 'yearly';
    }

    if (firstDate.includes('.')) {
      const parts = firstDate.split('.');
      if (parts.length === 2) return 'monthly';
      if (parts.length === 3 && parts[0] === '01') return 'monthly';
      if (parts.length === 3) return 'daily';
    }

    return 'monthly';
  }

  /**
   * Очистка временных файлов
   * @param {string} filePath - Путь к файлу
   */
  static cleanup(filePath) {
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

module.exports = ExcelProcessor;
