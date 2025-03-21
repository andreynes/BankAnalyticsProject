const ExcelProcessor = require('./excelProcessor');
const path = require('path');

class ExcelParser {
    static async parse(filePath, options = {}) {
        try {
            const fileExt = path.extname(filePath).toLowerCase();
            if (!['.xlsx', '.xls'].includes(fileExt)) {
                throw new Error('Неподдерживаемый формат файла');
            }

            const result = await ExcelProcessor.processFile(filePath);

            return {
                success: true,
                fileName: path.basename(filePath),
                parseDate: new Date(),
                data: result.data,
                metadata: {
                    sheetName: result.sheetName,
                    totalRows: result.totalRows,
                    totalColumns: result.totalColumns,
                    headers: result.headers,
                    suggestedTags: result.suggestedTags
                }
            };
        } catch (error) {
            return {
                success: false,
                fileName: path.basename(filePath),
                parseDate: new Date(),
                error: error.message
            };
        }
    }

    static validateData(parsedData) {
        if (!parsedData.success) {
            return {
                isValid: false,
                errors: [parsedData.error]
            };
        }

        const errors = [];

        // Проверяем наличие данных
        if (!parsedData.data || parsedData.data.length === 0) {
            errors.push('Файл не содержит данных');
        }

        // Проверяем заголовки
        if (!parsedData.metadata.headers || parsedData.metadata.headers.length === 0) {
            errors.push('Отсутствуют заголовки столбцов');
        }

        // Проверяем соответствие количества столбцов
        if (parsedData.data && parsedData.data.length > 0) {
            const hasInconsistentColumns = parsedData.data.some(
                row => row.row.size !== parsedData.metadata.totalColumns
            );
            if (hasInconsistentColumns) {
                errors.push('Несоответствие количества столбцов в строках');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = ExcelParser;