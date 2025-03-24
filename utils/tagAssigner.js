const AutoTagger = require('./autoTagger');

class TagAssigner {
    constructor() {
        this.autoTagger = new AutoTagger();
        
        // Специфические правила для бизнес-логики
        this.businessRules = {
            highValue: {
                condition: (value) => {
                    const amount = this.parseAmount(value);
                    return amount !== null && amount > 1000000;
                },
                tag: 'крупная_сумма'
            },
            negativeValue: {
                condition: (value) => {
                    const amount = this.parseAmount(value);
                    return amount !== null && amount < 0;
                },
                tag: 'отрицательное_значение'
            },
            emptyData: {
                condition: (value) => !value || value.toString().trim() === '',
                tag: 'пустые_данные'
            },
            specialClient: {
                condition: (value) => typeof value === 'string' && /ООО|ЗАО|ПАО|АО/.test(value),
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

    assignTags(data) {
        const basicTags = new Set(this.autoTagger.analyzeTags(data));
        
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

    parseAmount(value) {
        if (value === null ||  value === undefined ||  value === '') {
            return 0; // Возвращаем 0 вместо null для пустых значений
        }
        
        if (typeof value === 'number') {
            return value;
        }
        
        try {
            // Убираем все пробелы
            let normalized = value.toString().trim().replace(/\s+/g, '');
            if (!normalized) {
                return 0;
            }
    
            // Обрабатываем разные форматы чисел
            if (normalized.includes(',')) {
                if (normalized.includes('.')) {
                    // Если есть и точка и запятая, убираем запятые (разделители тысяч)
                    normalized = normalized.replace(/,/g, '');
                } else {
                    // Если есть только запятая, заменяем её на точку
                    normalized = normalized.replace(',', '.');
                }
            }
    
            // Удаляем все символы кроме цифр, точки и минуса
            normalized = normalized.replace(/[^\d.-]/g, '');
    
            const parsed = parseFloat(normalized);
            return isNaN(parsed) ? 0 : parsed; // Возвращаем 0 вместо null для невалидных чисел
        } catch (error) {
            return 0; // Возвращаем 0 в случае ошибки
        }
    }

    checkCategories(value, tags) {
        if (!value) return;
        const strValue = value.toString().toLowerCase();

        Object.entries(this.categories).forEach(([category, keywords]) => {
            if (keywords.some(keyword => strValue.includes(keyword.toLowerCase()))) {
                tags.add(category);
            }
        });
    }

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

        // Используем предопределенные типы из метаданных
        if (data.metadata?.columnTypes) {
            Object.entries(data.metadata.columnTypes).forEach(([column, type]) => {
                if (type === 'number') {
                    stats.numericalColumns.add(column);
                } else {
                    stats.categoricalColumns.add(column);
                }
            });
        }

        // Подсчитываем пустые значения
        data.data.forEach(row => {
            if (!row.row) return;
            for (let [_, value] of row.row) {
                if (!value || value.toString().trim() === '') {
                    stats.emptyValues++;
                }
            }
        });

        return {
            ...stats,
            numericalColumns: Array.from(stats.numericalColumns),
            categoricalColumns: Array.from(stats.categoricalColumns)
        };
    }

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