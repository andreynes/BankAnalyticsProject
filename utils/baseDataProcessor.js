// utils/baseDataProcessor.js

class BaseDataProcessor {
  /**
   * Базовый конструктор для всех процессоров
   * @param {Object} options - Настройки процессора
   */
  constructor(options = {}) {
    this.options = {
      maxBlockSize: 1000000, // Максимальный размер блока в байтах
      supportedFormats: [], // Поддерживаемые форматы файлов
      validateSchema: true, // Проверка схемы данных
      preserveFormatting: true, // Сохранение форматирования
      ...options
    };
  }

  /**
   * Базовый метод для обработки данных
   * @throws {Error} Должен быть реализован в дочерних классах
   */
  async process() {
    throw new Error('Method process() must be implemented');
  }

  /**
   * Проверка валидности данных
   * @param {*} data - Данные для проверки
   * @returns {boolean} - Результат проверки
   */
  validateData(data) {
    if (data === null || data === undefined) {
      return false;
    }

    if (this.options.validateSchema) {
      return this.validateSchema(data);
    }

    return true;
  }

  /**
   * Проверка схемы данных
   * @param {*} data - Данные для проверки
   * @returns {boolean} - Результат проверки
   */
  validateSchema(data) {
    if (Array.isArray(data)) {
      return data.every(item => typeof item === 'object' && item !== null);
    }
    return typeof data === 'object' && data !== null;
  }

  /**
   * Генерация уникального ID для блока данных
   * @returns {string} - Уникальный идентификатор
   */
  generateBlockId() {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Определение типа данных в ячейке
   * @param {*} value - Значение для анализа
   * @returns {string} - Тип данных (number, date, text, percentage, currency, empty)
   */
  determineCellType(value) {
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
  
    // Проверка на число (включая научную нотацию)
    if (/^-?\d+([.,]\d+)?([eE][+-]?\d+)?$/.test(strValue)) {
      return 'number';
    }
  
    // Проверка на валюту после проверки на число
    if (/^[$€₽]?\s*-?\d+([.,]\d+)?([kmbt])?$/i.test(strValue)) {
      return 'currency';
    }
  
    return 'text';
  }
  

  /**
   * Анализ структуры заголовков
   * @param {Array} headers - Массив заголовков
   * @returns {Object} - Структура заголовков с уровнями
   */
  analyzeHeaderStructure(headers) {
    const structure = {
      levels: 0,
      headers: [],
      hierarchyMap: new Map()
    };

    if (!Array.isArray(headers) || headers.length === 0) {
      return structure;
    }

    headers.forEach((header, index) => {
      const level = this.determineHeaderLevel(header);
      structure.levels = Math.max(structure.levels, level);
      
      structure.headers.push({
        value: header,
        level: level,
        index: index
      });
    });

    // Построение иерархии
    this.buildHeaderHierarchy(structure);

    return structure;
  }

  /**
   * Определение уровня заголовка
   * @param {string} header - Заголовок для анализа
   * @returns {number} - Уровень заголовка
   */
  determineHeaderLevel(header) {
    if (!header) return 1;

    // Проверка на форматирование заголовка
    if (typeof header === 'object' && header.level) {
      return header.level;
    }

    const str = header.toString();

    // Проверка на отступы
    const indentation = str.match(/^\s*/)[0].length;
    if (indentation > 0) {
      return Math.floor(indentation / 2) + 1;
    }

    // Проверка на нумерацию
    if (/^\d+\.\d+/.test(str)) {
      return 2;
    }
    if (/^\d+\./.test(str)) {
      return 1;
    }

    return 1;
  }

  /**
   * Построение иерархии заголовков
   * @param {Object} structure - Структура заголовков
   */
  buildHeaderHierarchy(structure) {
    const { headers } = structure;
    
    for (let i = 0; i < headers.length; i++) {
      const current = headers[i];
      let parent = null;

      // Поиск родительского заголовка
      for (let j = i - 1; j >= 0; j--) {
        if (headers[j].level < current.level) {
          parent = headers[j];
          break;
        }
      }

      if (parent) {
        structure.hierarchyMap.set(current.index, parent.index);
      }
    }
  }

  /**
   * Создание блока данных
   * @param {string} type - Тип блока (table, text, structured)
   * @param {Object} content - Содержимое блока
   * @param {Array} tags - Теги блока
   * @returns {Object} - Структура блока данных
   */
  createDataBlock(type, content, tags = []) {
    return {
      blockId: this.generateBlockId(),
      type: type,
      source: this.constructor.name.toLowerCase().replace('processor', ''),
      content: content,
      tags: tags,
      metadata: {
        created: new Date(),
        size: JSON.stringify(content).length
      }
    };
  }

  /**
   * Форматирование значения
   * @param {*} value - Значение для форматирования
   * @param {string} type - Тип данных
   * @returns {*} - Отформатированное значение
   */
  formatValue(value, type) {
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
   * Очистка временных файлов и ресурсов
   */
  cleanup() {
    // Реализация в дочерних классах
  }
}

module.exports = BaseDataProcessor;


