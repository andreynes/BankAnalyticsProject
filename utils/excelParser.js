"use strict";

const xlsx = require('xlsx');
const fs = require('fs');

// Улучшенная функция sanitize
function sanitize(cell) {
  // Базовая проверка на null/undefined
  if (cell === null || cell === undefined) return '';
  
  // Если это число
  if (typeof cell === 'number') {
    return cell.toFixed(2);
  }

  // Преобразование в строку и базовая очистка
  let str = cell.toString().trim();
  if (!str) return '';

  // Проверка на повторяющиеся символы
  if (/^(.)\1+$/i.test(str)) {
    return '';
  }

  // Проверка на спецсимволы
  if (/^[!@#$%^&*()\-+=\[\]{}|\\:;"'<>,.?/~`]+$/.test(str)) {
    return '';
  }

  // Проверка на число в строковом формате
  if (/^\-?\d+\.?\d*$/.test(str)) {
    return parseFloat(str).toFixed(2);
  }

  // Ограничение длины строки
  return str.length > 1000 ? str.substring(0, 1000) : str;
}

class ExcelParser {
  static parse(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found: " + filePath);
    }

    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    return this.processWorksheet(worksheet, sheetName);
  }

  static processWorksheet(worksheet, sheetName) {
    let rawData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false
    });

    // Очистка данных
    rawData = rawData
      .map(row => row.map(cell => sanitize(cell)))
      .filter(row => row.some(cell => cell !== ''));

    if (!rawData.length) {
      return {
        headers: [],
        data: [],
        metadata: {
          statistics: {
            rowCount: 0,
            columnCount: 0
          }
        },
        sheetName
      };
    }

    const headers = rawData[0].map(h => sanitize(h));
    const data = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const rowMap = new Map();
      
      headers.forEach((header, index) => {
        rowMap.set(header, row[index] || '');
      });

      if (row[0]) { // Проверка на наличие метки строки
        data.push({
          rowNumber: i,
          label: row[0],
          row: rowMap,
          tags: [] // Добавляем пустой массив тегов
        });
      }
    }

    return {
      headers,
      data,
      metadata: {
        statistics: {
          rowCount: data.length,
          columnCount: headers.length
        },
        columnTypes: this.determineColumnTypes(headers, data)
      },
      sheetName
    };
  }

  static determineColumnTypes(headers, data) {
    const columnTypes = new Map();
    
    headers.forEach(header => {
      const lc = header.toLowerCase();
      if (lc.includes('дата')) {
        columnTypes.set(header, 'date');
      } else if (lc.includes('сумма') || lc.includes('количество')) {
        columnTypes.set(header, 'number');
      } else {
        columnTypes.set(header, 'text');
      }
    });

    return columnTypes;
  }
}

class ExcelProcessor extends ExcelParser {
  static async processFile(filePath, options = {}) {
    const result = this.parse(filePath);
    return {
      ...result,
      vertical: false,
      totalRows: result.data.length + 1,
      totalColumns: result.headers.length
    };
  }

  static transpose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }
}

module.exports = {
  ExcelProcessor,
  ExcelParser,
  sanitize
};


