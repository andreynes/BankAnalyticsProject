class AutoTagger {
    constructor() {
        this.rules = {
            financial: {
                keywords: ['сумма', 'цена', 'стоимость', 'баланс', 'доход', 'расход', 'прибыль', 'выручка', 'платеж'],
                tag: 'финансы'
            },
            clients: {
                keywords: ['клиент', 'заказчик', 'покупатель', 'контрагент', 'партнер'],
                tag: 'клиенты'
            },
            products: {
                keywords: ['товар', 'продукт', 'артикул', 'номенклатура', 'материал'],
                tag: 'продукты'
            },
            dates: {
                keywords: ['дата', 'период', 'срок', 'квартал', 'год'],
                tag: 'временные_данные'
            },
            quantities: {
                keywords: ['количество', 'объем', 'штук', 'единиц', 'остаток'],
                tag: 'количественные_данные'
            }
        };

        // Регулярные выражения для определения типов данных
        this.patterns = {
            date: /^(дата|срок|период)/i,
            money: /(сумма|стоимость|цена|руб\.?|₽)/i,
            quantity: /(количество|шт\.?|кол-во)/i,
            percentage: /(%|процент)/i
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
        data.headers.forEach(header => {
            if (!header) return;
            const headerLower = header.toLowerCase();
            
            // Проверка по правилам
            Object.values(this.rules).forEach(rule => {
                if (rule.keywords.some(keyword => headerLower.includes(keyword))) {
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

        // Анализ данных
        if (data.data && data.data.length > 0) {
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
               /^\d{4}[-.\/]\d{2}[-.\/]\d{2}$/.test(value);   // YYYY.MM.DD
    }

    /**
     * Проверка, похоже ли значение на денежную сумму
     * @param {string} value - проверяемое значение
     * @returns {boolean}
     */
    looksLikeMoney(value) {
        return /^-?\d+(\s?\d+)*([.,]\d{2})?(\s?(?:руб\.?|₽))?$/.test(value);
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