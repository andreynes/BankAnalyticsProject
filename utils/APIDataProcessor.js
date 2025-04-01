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
            const startTime = Date.now();
            const result = {
                fileName: `api_data_${Date.now()}`,
                documentType: 'api',
                source: metadata.source || 'unknown',
                globalTags: new Set(),
                blocks: [],
                metadata: {
                    requestDate: new Date(),
                    statistics: {
                        startTime,
                        totalSize: JSON.stringify(apiData).length,
                        processedBlocks: 0,
                        processedFields: 0,
                        processingTime: 0
                    },
                    ...metadata
                }
            };

            if (Array.isArray(apiData)) {
                const block = await this.processArrayData(apiData);
                result.blocks.push(block);
                block.tags.forEach(tag => result.globalTags.add(tag));
                result.metadata.statistics.processedBlocks++;
                result.metadata.statistics.processedFields += apiData.length;
            } else if (typeof apiData === 'object' && apiData !== null) {
                const blocks = await this.processObjectData(apiData);
                result.blocks.push(...blocks);
                blocks.forEach(block => {
                    block.tags.forEach(tag => result.globalTags.add(tag));
                    result.metadata.statistics.processedBlocks++;
                });
                result.metadata.statistics.processedFields += Object.keys(apiData).length;
            } else {
                throw new Error('Invalid API data format');
            }

            result.metadata.statistics.endTime = Date.now();
            result.metadata.statistics.processingTime =
                result.metadata.statistics.endTime - result.metadata.statistics.startTime;

            result.globalTags = Array.from(result.globalTags);
            return result;

        } catch (error) {
            if (error instanceof TypeError && error.message.includes('circular')) {
                throw new Error('Processing error: Circular reference detected');
            }
            throw new Error(`Processing error: ${error.message}`);
        }
    }

    /**
     * Обработка массива данных
     * @param {Array} data - Массив данных
     * @returns {Promise<Object>} - Блок данных
     */
    async processArrayData(data) {
        if (!Array.isArray(data) || !data.length) {
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
                        type: this.determineCellType(value),
                        metadata: this.extractValueMetadata(value)
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
        if (!data || typeof data !== 'object') {
            return [this.createEmptyBlock()];
        }

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
                    tags: this.extractTagsFromObject(value, key)
                });
            } else {
                const type = this.determineCellType(value);
                blocks.push({
                    type: 'value',
                    source: 'api',
                    content: {
                        title: key,
                        value: value,
                        type: type,
                        metadata: this.extractValueMetadata(value)
                    },
                    tags: this.generateValueTags(value, key, type)
                });
            }
        }

        return blocks;
    }

    /**
     * Определение типа данных
     * @param {*} value - Значение для анализа
     * @returns {string} - Тип данных
     */
    determineCellType(value) {
        if (value === null || value === undefined) {
            return 'empty';
        }

        if (value instanceof Date) {
            return 'date';
        }

        // Если значение числовое
        if (typeof value === 'number') {
            return 'number';
        }

        const strValue = value.toString().trim();

        // Проверка на валюту
        if (/^[₽$€¥£]/.test(strValue)) {
            return 'currency';
        }

        // Проверка на процент
        if (/^-?\d+([.,]\d+)?%$/.test(strValue)) {
            return 'percentage';
        }

        // Проверка на число
        if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
            return 'number';
        }

        // Проверка на дату
        if (
            /^\d{4}-\d{2}-\d{2}/.test(strValue) ||
            /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue) ||
            /^\d{4}$/.test(strValue)
        ) {
            return 'date';
        }

        return 'text';
    }

    /**
     * Проверка является ли значение числовым
     * @param {*} value - Значение для проверки
     * @returns {boolean} - Результат проверки
     */
    isNumeric(value) {
        if (typeof value === 'number') return true;
        if (typeof value !== 'string') return false;
        return !isNaN(value) && !isNaN(parseFloat(value));
    }

    /**
     * Извлечение метаданных значения
     * @param {*} value - Значение для анализа
     * @returns {Object} - Метаданные значения
     */
    extractValueMetadata(value) {
        const metadata = {};

        if (value !== null && value !== undefined) {
            const type = this.determineCellType(value);
            
            switch (type) {
                case 'date':
                    metadata.format = this.determineDateFormat(value);
                    break;
                case 'number':
                case 'currency':
                case 'percentage':
                    metadata.precision = this.determineNumericPrecision(value);
                    if (type === 'currency') {
                        metadata.currency = this.extractCurrencySymbol(value);
                        metadata.originalValue = this.extractNumericValue(value);
                    }
                    if (type === 'percentage') {
                        metadata.originalValue = parseFloat(value.toString().replace('%', '')) / 100;
                    }
                    break;
            }
        }

        return metadata;
    }

    /**
     * Генерация тегов для значения
     */
    generateValueTags(value, key, type) {
        const tags = new Set();
        
        // Добавляем ключ как тег
        if (key) {
            tags.add(key.toLowerCase());
        }

        // Обработка значения в зависимости от типа
        if (type === 'date') {
            const year = new Date(value).getFullYear().toString();
            tags.add(year);
        } else if (type === 'number') {
            if (value >= 1900 && value <= 2100) {
                tags.add(value.toString());
            }
        } else if (typeof value === 'string') {
            // Извлекаем годы
            const years = value.match(/\b(19|20)\d{2}\b/g);
            if (years) {
                years.forEach(year => tags.add(year));
            }

            // Извлекаем ключевые слова
            const words = value.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
            if (words) {
                words.forEach(word => tags.add(word.toLowerCase()));
            }

            // Добавляем бизнес-метрики
            const metrics = ['revenue', 'profit', 'margin', 'growth', 'sales'];
            metrics.forEach(metric => {
                if (value.toLowerCase().includes(metric)) {
                    tags.add(metric);
                }
            });
        }

        return Array.from(tags);
    }

    /**
     * Извлечение тегов из массива
     * @param {Array} data - Массив данных
     * @returns {Set} - Набор тегов
     */
    extractTagsFromArray(data) {
      const tags = new Set();
      
      if (!Array.isArray(data)) {
          return tags;
      }

      data.forEach(item => {
          if (typeof item === 'object' && item !== null) {
              Object.entries(item).forEach(([key, value]) => {
                  if (key) {
                      tags.add(key.toLowerCase());
                  }
                  
                  if (typeof value === 'string') {
                      this.extractTagsFromText(value).forEach(tag => tags.add(tag));
                  } else if (typeof value === 'number') {
                      if (value >= 1900 && value <= 2100) {
                          tags.add(value.toString());
                      }
                  }
              });
          }
      });

      return tags;
  }

  /**
   * Извлечение тегов из объекта
   * @param {Object} obj - Объект для анализа
   * @param {string} parentKey - Родительский ключ
   * @returns {Array} - Массив тегов
   */
  extractTagsFromObject(obj, parentKey = '') {
      const tags = new Set();
      
      if (!obj || typeof obj !== 'object') {
          return Array.from(tags);
      }

      const processValue = (value, key) => {
          if (key) {
              tags.add(key.toLowerCase());
              if (parentKey) {
                  tags.add(`${parentKey}.${key}`.toLowerCase());
              }
          }

          if (typeof value === 'string') {
              const years = value.match(/\b(19|20)\d{2}\b/g);
              if (years) {
                  years.forEach(year => tags.add(year));
              }

              const words = value.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
              if (words) {
                  words.forEach(word => tags.add(word.toLowerCase()));
              }

              const metrics = ['revenue', 'profit', 'margin', 'growth', 'sales'];
              metrics.forEach(metric => {
                  if (value.toLowerCase().includes(metric)) {
                      tags.add(metric);
                  }
              });
          } else if (typeof value === 'number') {
              if (value >= 1900 && value <= 2100) {
                  tags.add(value.toString());
              }
          } else if (Array.isArray(value)) {
              value.forEach(v => processValue(v, key));
          } else if (typeof value === 'object' && value !== null) {
              Object.entries(value).forEach(([k, v]) =>
                  processValue(v, parentKey ? `${parentKey}.${k}` : k)
              );
          }
      };

      processValue(obj, parentKey);
      return Array.from(tags);
  }

  /**
   * Извлечение тегов из текста
   * @param {string} text - Текст для анализа
   * @returns {Set} - Набор тегов
   */
  extractTagsFromText(text) {
      const tags = new Set();

      if (!text) return tags;

      const strValue = text.toString();

      // Извлекаем годы
      const years = strValue.match(/\b(19|20)\d{2}\b/g);
      if (years) {
          years.forEach(year => tags.add(year));
      }

      // Извлекаем ключевые слова
      const words = strValue.match(/\b[A-ZА-Я][a-zа-я]{2,}\b/g);
      if (words) {
          words.forEach(word => tags.add(word.toLowerCase()));
      }

      return tags;
  }

  /**
   * Определение формата даты
   * @param {*} value - Значение для анализа
   * @returns {string} - Формат даты
   */
  determineDateFormat(value) {
      if (!value) return 'unknown';
      
      const strValue = value.toString();
      
      if (/^\d{4}$/.test(strValue)) {
          return 'yearly';
      }
      
      if (/^\d{2}[./-]\d{4}$/.test(strValue)) {
          return 'monthly';
      }
      
      if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue) ||
          /^\d{4}-\d{2}-\d{2}/.test(strValue)) {
          return 'daily';
      }
      
      return 'unknown';
  }

  /**
   * Определение точности числа
   * @param {number} value - Число для анализа
   * @returns {number} - Количество десятичных знаков
   */
  determineNumericPrecision(value) {
      if (!this.isNumeric(value)) return 0;
      const str = value.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      return decimals;
  }

  /**
   * Извлечение символа валюты
   * @param {string} value - Строка для анализа
   * @returns {string} - Символ валюты
   */
  extractCurrencySymbol(value) {
      if (!value) return '';
      const match = value.toString().match(/^([₽$€¥£])/);
      return match ? match[1] : '';
  }

  /**
   * Извлечение числового значения
   * @param {string} value - Строка для анализа
   * @returns {number} - Числовое значение
   */
  extractNumericValue(value) {
      if (!value) return 0;
      const numStr = value.toString().replace(/[^-0-9.,]/g, '').replace(',', '.');
      return parseFloat(numStr) || 0;
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
   * Получение значения по пути в объекте
   * @param {Object} obj - Объект
   * @param {string} path - Путь к значению
   * @returns {*} - Значение
   */
  getValueByPath(obj, path) {
      if (!obj || !path) return undefined;
      return path.split('.').reduce((current, key) => {
          return current && typeof current === 'object' ? current[key] : undefined;
      }, obj);
  }

  /**
   * Преобразование вложенного объекта в плоскую структуру
   * @param {Object} obj - Объект для преобразования
   * @returns {Object} - Плоская структура
   */
  flattenObject(obj) {
      if (!obj || typeof obj !== 'object') {
          return {};
      }

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
}

module.exports = APIDataProcessor;





