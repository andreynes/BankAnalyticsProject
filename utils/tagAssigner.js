const AutoTagger = require('./autoTagger');

class TagAssigner {
    constructor() {
        this.autoTagger = new AutoTagger();
        
        // Специфические правила для бизнес-логики
        this.businessRules = {
            highValue: {
                condition: (value) => this.parseAmount(value) > 1000000,
                tag: 'крупная_сумма'
            },
            negativeValue: {
                condition: (value) => this.parseAmount(value) < 0,
                tag: 'отрицательное_значение'
            },
            emptyData: {
                condition: (value) => !value || value.toString().trim() === '',
                tag: 'пустые_данные'
            },
            specialClient: {
                condition: (value) => /ООО|ЗАО|ПАО|АО/.test(value),
                tag: 'юридическое_лицо'
            }
        };

        // Категории для классификации данных
        this.categories = {
            'высокий_приоритет': ['срочно', 'важно', 'критично'],
            'низкий_приоритет': ['отложено', 'в очереди', 'черновик'],
            'документы': ['договор', 'счет', 'акт', 'накладная'],
            'статусы': ['новый', 'в работе', 'завершен', 'отменен']
        };
    }

    /**
     * Назначение тегов для данных
     * @param {Object} data - данные для тегирования
     * @returns {Object} - данные с тегами
     */
    assignTags(data) {
        // Получаем базовые теги от AutoTagger
        const basicTags = new Set(this.autoTagger.analyzeTags(data));
        
        // Анализируем данные по бизнес-правилам
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach(row => {
                if (!row.row) return;
                
                for (let [header, value] of row.row) {
                    // Применяем бизнес-правила
                    Object.values(this.businessRules).forEach(rule => {
                        if (rule.condition(value)) {
                            basicTags.add(rule.tag);
                        }
                    });

                    // Проверяем категории
                    this.checkCategories(value, basicTags);
                }
            });
        }

        // Добавляем метаданные
        const metadata = {
            tags: Array.from(basicTags),
            statistics: this.calculateStatistics(data),
            categories: this.groupByCategories(Array.from(basicTags))
        };

        return {
            ...data,
            metadata: {
                ...data.metadata,
                tagging: metadata
            }
        };
    }

    /**
     * Проверка значения на соответствие категориям
     * @param {string} value - проверяемое значение
     * @param {Set} tags - набор тегов
     */
    checkCategories(value, tags) {
        if (!value) return;
        const strValue = value.toString().toLowerCase();

        Object.entries(this.categories).forEach(([category, keywords]) => {
            if (keywords.some(keyword => strValue.includes(keyword.toLowerCase()))) {
                tags.add(category);
            }
        });
    }

    /**
     * Парсинг числового значения
     * @param {string|number} value - значение для парсинга
     * @returns {number}
     */
    parseAmount(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        
        // Сначала удаляем все пробелы
        let normalized = value.toString().replace(/\s+/g, '');
        
        // Обрабатываем разные форматы чисел
        if (normalized.includes(',')) {
            // Если есть и точка и запятая, считаем запятую разделителем тысяч
            if (normalized.includes('.')) {
                normalized = normalized.replace(/,/g, '');
            } else {
                // Иначе считаем запятую десятичным разделителем
                normalized = normalized.replace(',', '.');
            }
        }
        
        // Удаляем все нечисловые символы, кроме точки и минуса
        normalized = normalized.replace(/[^\d.-]/g, '');
        
        const result = parseFloat(normalized);
        return
        sNaN(result) ? 0 : result;
    }

    /**
     * Расчет статистики по данным
     * @param {Object} data - анализируемые данные
     * @returns {Object} статистика
     */
    calculateStatistics(data) {
        const stats = {
            totalRows: 0,
            emptyValues: 0,
            numericalColumns: new Set(),
            categoricalColumns: new Set()
        };

        if (!data.data || !Array.isArray(data.data)) {
            return {
                ...stats,
                numericalColumns: [],
                categoricalColumns: []
            };
        }

        stats.totalRows = data.data.length;

        // Создаем карту для анализа всех колонок
        const columnAnalysis = new Map();
        data.headers.forEach(header => {
            // Инициализируем анализ для каждой колонки
            columnAnalysis.set(header, {
                numerical: 0,
                categorical: 0,
                empty: 0,
                total: 0,
                // Если есть предопределенный тип, сохраняем его
                predefinedType: data.metadata?.columnTypes?.[header]
            });
        });

        // Анализируем данные
        data.data.forEach(row => {
            if (!row.row) return;
            
            for (let [header, value] of row.row) {
                const analysis = columnAnalysis.get(header);
                if (!analysis) continue;

                analysis.total++;
                
                if (!value || value.toString().trim() === '') {
                    stats.emptyValues++;
                    analysis.empty++;
                    continue;
                }

                const numValue = this.parseAmount(value);
                if (!isNaN(numValue) && numValue.toString() === value.toString().trim()) {
                    analysis.numerical++;
                } else {
                    analysis.categorical++;
                }
            }
        });

        // Определяем тип для каждой колонки
        for (let [header, analysis] of columnAnalysis) {
            // Если есть предопределенный тип, используем его
            if (analysis.predefinedType) {
                if (analysis.predefinedType === 'number') {
                    stats.numericalColumns.add(header);
                } else {
                    stats.categoricalColumns.add(header);
                }
                continue;
            }

            // Для колонок без предопределенного типа
            if (analysis.total === 0) {
                stats.categoricalColumns.add(header);
                continue;
            }

            const nonEmpty = analysis.total - analysis.empty;
            if (nonEmpty > 0 && (analysis.numerical / nonEmpty) > 0.7) {
                stats.numericalColumns.add(header);
            } else {
                stats.categoricalColumns.add(header);
            }
        }

        return {
            ...stats,
            numericalColumns: Array.from(stats.numericalColumns),
            categoricalColumns: Array.from(stats.categoricalColumns)
        };
    }

    /**
     * Группировка тегов по категориям
     * @param {Array} tags - список тегов
     * @returns {Object} сгруппированные теги
     */
    groupByCategories(tags) {
        const groups = {
            business: [],
            technical: [],
            content: [],
            other: []
        };

        tags.forEach(tag => {
            if (tag.startsWith('тип:') || tag.startsWith('формат:')) {
                groups.technical.push(tag);
            } else if (tag.includes('_')) {
                groups.business.push(tag);
            } else if (this.categories[tag]) {
                groups.content.push(tag);
            } else {
                groups.other.push(tag);
            }
        });

        return groups;
    }
}

module.exports = TagAssigner;