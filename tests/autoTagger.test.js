class AutoTagger {
    constructor() {
        this.rules = {
            financial: {
                keywords: ['сумма', 'платеж', 'цена', 'стоимость', 'баланс', 'доход', 'расход', 
                         'прибыль', 'выручка', 'продажа', 'руб', 'рубль', 'payment', 'cost', 'price'],
                tag: 'финансы'
            },
            clients: {
                keywords: ['клиент', 'заказчик', 'покупатель', 'контрагент', 'партнер', 
                         'организация', 'компания', 'фирма', 'client', 'customer'],
                tag: 'клиенты'
            },
            products: {
                keywords: ['товар', 'продукт', 'артикул', 'номенклатура', 'материал', 
                         'изделие', 'product', 'item', 'sku'],
                tag: 'продукты'
            },
            dates: {
                keywords: ['дата', 'период', 'срок', 'квартал', 'год', 'месяц', 
                         'date', 'period', 'year', 'month'],
                tag: 'временные_данные'
            },
            quantities: {
                keywords: ['количество', 'объем', 'штук', 'единиц', 'остаток', 
                         'число', 'шт', 'кол-во', 'quantity', 'amount'],
                tag: 'количественные_данные'
            },
            status: {
                keywords: ['статус', 'состояние', 'этап', 'стадия', 'готовность', 
                         'status', 'state', 'phase'],
                tag: 'статус'
            }
        };

        // Регулярные выражения для определения типов данных
        this.patterns = {
            date: /^(дата|срок|период|date)/i,
            money: /(сумма|стоимость|цена|руб\.?|₽|price|cost)/i,
            quantity: /(количество|шт\.?|кол-во|qty|amount)/i,
            percentage: /(%|процент|доля|percent)/i
        };
    }

    /**
     * Анализ заголовков и данных для определения тегов
     * @param {Object} data - данные из Excel
     * @returns {Array} - список тегов
     */
    analyzeTags(data) {
        const tags = new Set();

        // Анализ заголовков
        if (data.headers && Array.isArray(data.headers)) {
            data.headers.forEach(header => {
                if (!header) return;
                const headerLower = header.toLowerCase();
                
                // Проверка по правилам
                Object.values(this.rules).forEach(rule => {
                    if (rule.keywords.some(keyword => headerLower.includes(keyword.toLowerCase()))) {
                        tags.add(rule.tag);
                    }
                });

                // Определение типа данных
                Object.entries(this.patterns).forEach(([type, pattern]) => {
                    if (pattern.test(headerLower)) {
                        tags.add(`тип:${type}`);
                    }
                });
            });
        }

        // Анализ данных
        if (data.data && Array.isArray(data.data)) {
            this.analyzeDataContent(data.data, tags);
        }

        return Array.from(tags);
    }

    /**
     * Анализ содержимого данных
     * @param {Array} rows - строки данных
     * @param {Set} tags - набор тегов
     */
    analyzeDataContent(rows, tags) {
        // Анализ первых 100 строк для определения паттернов
        const sampleSize = Math.min(rows.length, 100);
        
        for (let i = 0; i < sampleSize; i++) {
            const row = rows[i];
            if (!row.row) continue;

            // Анализируем значения в строке
            for (let [header, value] of row.row) {
                if (!value) continue;
                value = String(value).toLowerCase();

                // Определение форматов данных
                if (this.looksLikeDate(value)) {
                    tags.add('формат:дата');
                }
                if (this.looksLikeMoney(value)) {
                    tags.add('формат:деньги');
                }
                if (this.looksLikePercentage(value)) {
                    tags.add('формат:процент');
                }
            }
        }
    }

    /**
     * Проверка, похоже ли значение на дату
     * @param {string} value - проверяемое значение
     * @returns {boolean}
     */
    looksLikeDate(value) {
        return /^\d{2}[-.\/]\d{2}[-.\/]\d{4}$/.test(value) || // DD.MM.YYYY
               /^\d{4}[-.\/]\d{2}[-.\/]\d{2}$/.test(value) || // YYYY.MM.DD
               /^\d{2}[-.\/]\d{2}[-.\/]\d{2}$/.test(value);   // DD.MM.YY
    }

    /**
     * Проверка, похоже ли значение на денежную сумму
     * @param {string} value - проверяемое значение
     * @returns {boolean}
     */
    looksLikeMoney(value) {
        return /^-?\d+(\s?\d+)*([.,]\d{2})?(\s?(?:руб\.?|₽|р\.|RUB))?$/i.test(value);
    }

    /**
     * Проверка, похоже ли значение на процент
     * @param {string} value - проверяемое значение
     * @returns {boolean}
     */
    looksLikePercentage(value) {
        return /^-?\d+([.,]\d+)?%$/.test(value);
    }
}

module.exports = AutoTagger;