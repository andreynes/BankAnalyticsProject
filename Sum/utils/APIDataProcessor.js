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
            } else {
                const blocks = await this.processObjectData(apiData);
                result.blocks.push(...blocks);
                blocks.forEach(block => {
                    block.tags.forEach(tag => result.globalTags.add(tag));
                    result.metadata.statistics.processedBlocks++;
                });
                result.metadata.statistics.processedFields += Object.keys(apiData).length;
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
                    metadata.precision = this.determineNumericPrecision(value);
                    break;
                case 'percentage':
                    metadata.originalValue = parseFloat(value.toString().replace('%', '')) / 100;
                    break;
                case 'currency':
                    metadata.currency = this.extractCurrencySymbol(value);
                    metadata.originalValue = this.extractNumericValue(value);
                    break;
            }
        }

        return metadata;
    }

    /**
     * Генерация тегов для значения
     * @param {*} value - Значение
     * @param {string} key - Ключ
     * @param {string} type - Тип данных
     * @returns {Array} - Массив тегов
     */
    generateValueTags(value, key, type) {
        const tags = new Set();
        
        // Добавляем ключ как тег
        tags.add(key.toLowerCase());

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
        
        data.forEach(item => {
            Object.entries(item).forEach(([key, value]) => {
                tags.add(key.toLowerCase());
                
                if (typeof value === 'string') {
                    this.extractTagsFromText(value).forEach(tag => tags.add(tag));
                } else if (typeof value === 'number') {
                    if (value >= 1900 && value <= 2100) {
                        tags.add(value.toString());
                    }
                }
            });
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
    extractCurrencySymbol(value) {
        const match = value.toString().match(/^([₽$€¥£])/);
        return match ? match[1] : '';
    }

    /**
     * Извлечение числового значения
     * @param {string} value - Строка для анализа
     * @returns {number} - Числовое значение
     */
    extractNumericValue(value) {
        return parseFloat(value.toString().replace(/[^-0-9.,]/g, '').replace(',', '.'));
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
     * Преобразование вложенного объекта в плоскую структуру
     * @param {Object} obj - Объект для преобразования
     * @returns {Object} - Плоская структура
     */

    getValueByPath(obj, path) {
      return path.split('.').reduce((current, key) => {
          return current && typeof current === 'object' ? current[key] : undefined;
      }, obj);
    }
  
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

        const strValue = value.toString().trim();

        // Проверка на валюту
        if (/^[$€₽¥£]?\s*-?\d+([.,]\d+)?([kmbt])?$/i.test(strValue)) {
            return 'currency';
        }

        // Проверка на процент
        if (/^-?\d+([.,]\d+)?%$/.test(strValue)) {
            return 'percentage';
        }

        // Проверка на дату
        if (/^\d{4}-\d{2}-\d{2}/.test(strValue) ||
            /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(strValue)) {
            return 'date';
        }

        // Проверка на число
        if (/^-?\d+([.,]\d+)?$/.test(strValue)) {
            return 'number';
        }

        return 'text';
    }
}

module.exports = APIDataProcessor;





