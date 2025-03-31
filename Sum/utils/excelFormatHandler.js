class ExcelFormatHandler {
    /**
     * Обработка различных форматов дат
     * @param {any} value - значение для обработки
     * @returns {string} - форматированная дата или исходное значение
     */
    static handleDate(value) {
        if (!value) return '';
        
        try {
            // Проверяем, является ли значение датой Excel (числом)
            if (typeof value === 'number') {
                // Преобразуем число Excel в дату JavaScript
                const date = new Date((value - 25569) * 86400 * 1000);
                return date.toISOString().split('T')[0];
            }
            
            // Пробуем распарсить строку как дату
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            
            return String(value);
        } catch (error) {
            return String(value);
        }
    }

    /**
     * Обработка числовых значений
     * @param {any} value - значение для обработки
     * @returns {string} - форматированное число или исходное значение
     */
    static handleNumber(value) {
        if (value === null || value === undefined) return '';
        
        try {
            // Если это строка с запятой вместо точки
            if (typeof value === 'string' && value.includes(',')) {
                value = value.replace(',', '.');
            }
            
            const number = parseFloat(value);
            if (!isNaN(number)) {
                // Форматируем число с двумя десятичными знаками
                return number.toFixed(2);
            }
            
            return String(value);
        } catch (error) {
            return String(value);
        }
    }

    /**
     * Обработка текстовых значений
     * @param {any} value - значение для обработки
     * @returns {string} - обработанный текст
     */
    static handleText(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    /**
     * Определение типа данных колонки
     * @param {Array} values - массив значений колонки
     * @returns {string} - тип данных (date, number, text)
     */
    static detectColumnType(values) {
        const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonEmptyValues.length === 0) return 'text';

        const dateCount = nonEmptyValues.filter(v => !isNaN(new Date(v).getTime())).length;
        const numberCount = nonEmptyValues.filter(v => !isNaN(parseFloat(v))).length;

        if (dateCount / nonEmptyValues.length > 0.7) return 'date';
        if (numberCount / nonEmptyValues.length > 0.7) return 'number';
        return 'text';
    }

    /**
     * Автоматическое определение и обработка значения
     * @param {any} value - значение для обработки
     * @param {string} columnType - тип колонки
     * @returns {string} - обработанное значение
     */
    static autoFormat(value, columnType = 'text') {
        switch (columnType) {
            case 'date':
                return this.handleDate(value);
            case 'number':
                return this.handleNumber(value);
            default:
                return this.handleText(value);
        }
    }
}

module.exports = ExcelFormatHandler;