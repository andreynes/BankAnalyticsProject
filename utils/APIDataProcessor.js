// utils/apiDataProcessor.js

const BaseDataProcessor = require('./baseDataProcessor');

class APIDataProcessor extends BaseDataProcessor {
  constructor(options = {}) {
    super({
      supportedFormats: ['json', 'xml'],
      validateSchema: true,
      ...options
    });
  }

  /**
   * Обработка данных из API
   * @param {Object|Array} apiData - Данные из API
   * @param {Object} metadata - Метаданные запроса
   * @returns {Promise<Object>} - Обработанные данные
   */

async process(apiData, metadata = {}) {
  if (!apiData) {
    throw new Error('Processing error: API data is required');
  }

  try {
    const result = {
      fileName: `api_data_${Date.now()}`,
      documentType: 'api',
      source: metadata.source || 'unknown',
      globalTags: new Set(),
      blocks: [],
      metadata: {
        requestDate: new Date(),
        ...metadata
      }
    };

    if (Array.isArray(apiData)) {
      const block = await this.processArrayData(apiData);
      result.blocks.push(block);
      block.tags.forEach(tag => result.globalTags.add(tag));
    } else {
      const blocks = await this.processObjectData(apiData);
      result.blocks.push(...blocks);
      blocks.forEach(block => {
        block.tags.forEach(tag => result.globalTags.add(tag));
      });
    }

    result.globalTags = Array.from(result.globalTags);
    return result;

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      throw new Error('Processing error: Circular reference detected');
    }
    throw new Error(`Processing error: ${error.message}`);
  }
}
// utils/wordProcessor.js

async processTextBlock(content) {
  const isHeading = content.startsWith('Heading');
  const formatting = {
    bold: content.includes('**') || isHeading,
    italic: content.includes('_'),
    size: isHeading ? 'large' : 'normal',
    alignment: this.determineAlignment(content)
  };

  return {
    type: 'text',
    content: {
      text: content,
      paragraphs: content.split('\n').filter(p => p.trim()),
      isHeading,
      formatting
    },
    tags: Array.from(this.extractTags(content))
  };
}


determineAlignment(content) {
  if (content.startsWith('>')) return 'right';
  if (content.startsWith('<')) return 'left';
  if (content.startsWith('|')) return 'center';
  return 'left';
}



  /**
   * Обработка массива данных
   * @param {Array} data - Массив данных
   * @returns {Promise<Object>} - Блок данных
   */
  async processArrayData(data) {
    if (!data.length) {
      return this.createEmptyBlock();
    }

    const headers = Object.keys(data[0]).map(key => ({
      value: key,
      level: 1
    }));

    const rows = data.map((item, index) => ({
      rowNumber: index + 1,
      cells: new Map(
        Object.entries(item).map(([key, value]) => [
          key,
          {
            value: value,
            type: this.determineCellType(value)
          }
        ])
      )
    }));

    const tags = this.extractTagsFromArray(data);

    return {
      type: 'table',
      source: 'api',
      content: {
        headers,
        rows
      },
      tags: Array.from(tags)
    };
  }

  /**
   * Обработка объекта данных
   * @param {Object} data - Объект данных
   * @returns {Promise<Array>} - Массив блоков данных
   */
  async processObjectData(data) {
    const blocks = [];
    const flattenedData = this.flattenObject(data);

    for (const [key, value] of Object.entries(flattenedData)) {
      if (Array.isArray(value)) {
        const block = await this.processArrayData(value);
        block.content.title = key;
        blocks.push(block);
      } else if (typeof value === 'object' && value !== null) {
        blocks.push({
          type: 'structured',
          source: 'api',
          content: {
            title: key,
            data: value
          },
          tags: this.extractTagsFromObject(value)
        });
      } else {
        blocks.push({
          type: 'value',
          source: 'api',
          content: {
            title: key,
            value: value,
            type: this.determineCellType(value)
          },
          tags: [key.toLowerCase()]
        });
      }
    }

    return blocks;
  }

  /**
   * Создание пустого блока
   * @returns {Object} - Пустой блок данных
   */
  createEmptyBlock() {
    return {
      type: 'table',
      source: 'api',
      content: {
        headers: [],
        rows: []
      },
      tags: []
    };
  }

  /**
   * Извлечение тегов из массива
   * @param {Array} data - Массив данных
   * @returns {Set} - Набор тегов
   */
  extractTagsFromObject(obj) {
    const tags = new Set();
  
    const processValue = (value, key) => {
      // Добавляем ключ как тег
      tags.add(key.toLowerCase());
  
      if (typeof value === 'string') {
        this.extractTagsFromText(value).forEach(tag => tags.add(tag));
      } else if (typeof value === 'number') {
        // Проверяем, является ли число годом
        if (value >= 1900 && value <= 2100) {
          tags.add(value.toString());
        }
      } else if (Array.isArray(value)) {
        value.forEach(v => processValue(v, key));
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([k, v]) => processValue(v, k));
      }
    };
  
    Object.entries(obj).forEach(([key, value]) => processValue(value, key));
    return Array.from(tags);
  }
  

  /**
   * Извлечение тегов из объекта
   * @param {Object} obj - Объект для анализа
   * @returns {Array} - Массив тегов
   */
  extractTagsFromObject(obj) {
    const tags = new Set();

    const processValue = (value) => {
      if (typeof value === 'string') {
        this.extractTagsFromText(value).forEach(tag => tags.add(tag));
      } else if (Array.isArray(value)) {
        value.forEach(processValue);
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(processValue);
      }
    };

    processValue(obj);
    return Array.from(tags);
  }

  /**
   * Извлечение тегов из текста
   * @param {string} text - Текст для анализа
   * @returns {Array} - Массив тегов
   */
  extractTagsFromText(text) {
    const tags = new Set();

    // Извлекаем годы
    const years = text.toString().match(/\b(19|20)\d{2}\b/g);
    if (years) {
      years.forEach(year => tags.add(year));
    }

    // Извлекаем ключевые слова
    const words = text.toString().match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
    if (words) {
      words.forEach(word => tags.add(word.toLowerCase()));
    }

    return Array.from(tags);
  }

  /**
   * Преобразование вложенного объекта в плоскую структуру
   * @param {Object} obj - Объект для преобразования
   * @returns {Object} - Плоская структура
   */
  flattenObject(obj) {
    const result = {};
    
    function recurse(current, prop) {
      if (Array.isArray(current)) {
        result[prop] = current;
      } else if (typeof current === 'object' && current !== null) {
        for (const p in current) {
          const newProp = prop ? `${prop}.${p}` : p;
          if (typeof current[p] === 'object' && !Array.isArray(current[p])) {
            recurse(current[p], newProp);
          } else {
            result[newProp] = current[p];
          }
        }
      } else {
        result[prop] = current;
      }
    }
    
    recurse(obj, '');
    return result;
  }

  /**
   * Получение значения по пути в объекте
   * @param {Object} obj - Объект для поиска
   * @param {string} path - Путь к значению
   * @returns {*} - Найденное значение
   */
  getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}

module.exports = APIDataProcessor;


