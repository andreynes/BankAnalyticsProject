'use strict';
const ExcelProcessor = require('./excelProcessor');
const path = require('path');

function sanitize(cell) {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number') {
        return cell.toFixed(2);
    }
    let str = cell.toString().trim();
    if (!str) return '';
    // Если строка состоит исключительно из одного повторяющегося символа
    if (/^(.)\1+$/i.test(str)) {
        return '';
    }
    // Если строка состоит только из специальных символов
    if (/^[!@#$%^&*()]+$/.test(str)) {
        return '';
    }
    // Если строка выглядит как число, форматируем его
    if (/^-?\d+(\.\d+)?$/.test(str)) {
        let num = parseFloat(str);
        return num.toFixed(2);
    }
    return str;
}

class ExcelParser {
    static async parse(filePath, options = {}) {
        try {
            const fileExt = path.extname(filePath).toLowerCase();
            if (!['.xlsx', '.xls'].includes(fileExt)) {
                throw new Error('Неподдерживаемый формат файла');
            }
            const effectiveOptions = Object.keys(options).length === 0 ? { removeHeaderRow: false } : options;
            const result = await ExcelProcessor.processFile(filePath, effectiveOptions);
            
            let sheetData = [];
            if (result.headers && Array.isArray(result.headers)) {
                const sanitizedHeaders = result.headers.map(cell => sanitize(cell));
                sheetData.push(sanitizedHeaders);
                if (result.data && Array.isArray(result.data)) {
                    result.data.forEach(row => {
                        if (!row || !Array.isArray(row)) return;
                        const newRow = [];
                        for (let j = 0; j < sanitizedHeaders.length; j++) {
                            let cell = (row[j] !== undefined && row[j] !== null) ? row[j] : '';
                            newRow.push(sanitize(cell));
                        }
                        sheetData.push(newRow);
                    });
                }
            } else {
                sheetData = result.data;
            }
            
            let transformedData = [];
            if (sheetData && sheetData.length > 0) {
                const headerRow = sheetData[0] || [];
                for (let i = 1; i < sheetData.length; i++) {
                    let currentRow = sheetData[i];
                    if (!currentRow || currentRow.length === 0) continue;
                    let pairs = [];
                    for (let j = 0; j < headerRow.length; j++) {
                        const header = headerRow[j] || '';
                        const value = (currentRow[j] !== undefined) ? currentRow[j] : '';
                        pairs.push([header, value]);
                    }
                    if (pairs.every(pair => pair[1] === '')) continue;
                    transformedData.push({ row: pairs });
                }
            }
            
            let totalEmpty = 0;
            transformedData.forEach(item => {
                if (item.row && Array.isArray(item.row)) {
                    totalEmpty += item.row.filter(pair => pair[1] === '').length;
                }
            });
            
            return {
                success: true,
                fileName: path.basename(filePath),
                parseDate: new Date(),
                data: transformedData,
                metadata: {
                    sheetName: result.sheetName,
                    totalRows: result.totalRows,
                    totalColumns: result.totalColumns,
                    headers: (sheetData && sheetData.length > 0) ? sheetData[0] : [],
                    statistics: {
                        totalEmpty: totalEmpty
                    },
                    tagging: { tags: [] }
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
        const errors = [];
        if (!parsedData.success) {
            return {
                isValid: false,
                errors: [parsedData.error]
            };
        }
        if (!parsedData.data || parsedData.data.length === 0) {
            errors.push('Файл не содержит данных');
        }
        if (!parsedData.metadata.headers || parsedData.metadata.headers.length === 0) {
            errors.push('Отсутствуют заголовки столбцов');
        }
        const inconsistent = parsedData.data.some(item => !item || !item.row);
        if (inconsistent) {
            errors.push('Один или несколько рядов имеют неверный формат');
        }
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = ExcelParser;


