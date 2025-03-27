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
      return data != null;
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
     * @returns {string} - Тип данных (number, date, text)
     */
    determineCellType(value) {
      if (value === null || value === undefined || value === '') {
        return 'empty';
      }
      
      const strValue = value.toString().trim();
      
      // Проверка на дату
      if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue)) return 'date';
      if (/^\d{4}[./-]\d{2}[./-]\d{2}$/.test(strValue)) return 'date';
      
      // Проверка на число
      if (/^-?\d*\.?\d+$/.test(strValue)) return 'number';
      
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
      // По умолчанию все заголовки на одном уровне
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
        const prev = headers[i - 1];
        
        if (prev && current.level > prev.level) {
          structure.hierarchyMap.set(current.index, prev.index);
        }
      }
    }
  
  
    /**
     * Создание блока данных
     * @param {string} type - Тип блока (table, text, api)
     * @param {Object} content - Содержимое блока
     * @param {Array} tags - Теги блока
     * @returns {Object} - Структура блока данных
     */
    createDataBlock(type, content, tags = []) {
      return {
        blockId: this.generateBlockId(),
        type: type,
        source: {
          type: this.constructor.name.toLowerCase().replace('processor', ''),
          details: new Map()
        },
        content: content,
        structure: this.analyzeHeaderStructure(content.headers || []),
        tags: tags
      };
    }
  }
  
  
  module.exports = BaseDataProcessor;
  
  
  
  