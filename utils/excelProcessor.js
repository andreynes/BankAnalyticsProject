"use strict";

const xlsx = require('xlsx');
const fs = require('fs');

class ExcelProcessor {
  static async processFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found: " + filePath);
    }

    const workbook = xlsx.readFile(filePath, { 
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });
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

    if (!rawData.length) {
      return this.createEmptyResult(sheetName);
    }

    // Получаем название компании и даты
    const companyName = rawData[0][0];
    const dates = rawData[0].slice(1).map(date => date.toString().trim());

    // Получаем показатели и их значения
    const data = [];
    const indicators = [];

    for (let i = 1; i < rawData.length; i++) {
      const indicator = rawData[i][0];
      if (!indicator) continue;

      indicators.push(indicator);
      const values = new Map();
      
      // Собираем значения по датам
      dates.forEach((date, j) => {
        const value = this.sanitizeValue(rawData[i][j + 1]);
        values.set(date, value);
      });

      data.push({
        rowNumber: i,
        label: indicator,
        row: new Map([
          ['indicator', indicator],
          ['values', values]
        ]),
        tags: []
      });
    }

    // Генерируем теги
    const tags = this.generateTags(companyName, indicators, dates, data);
    data.forEach(item => {
      item.tags = tags;
    });

    return {
      companyName,
      dates,
      indicators,
      data,
      metadata: {
        statistics: {
          rowCount: data.length,
          columnCount: dates.length + 1,
          processedAt: new Date()
        },
        tagging: {
          tags,
          tagCount: tags.length
        }
      },
      sheetName,
      totalRows: rawData.length,
      totalColumns: dates.length + 1
    };
  }

  static sanitizeValue(value) {
    if (value === null || value === undefined || value === '') return '';
    
    // Обработка числовых значений
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Проверка на процентное значение
      if (value.endsWith('%')) return value;
      // Проверка на число
      if (/^-?\d+([.,]\d+)?$/.test(value)) {
        return parseFloat(value.replace(',', '.'));
      }
    }
    return value.toString();
  }

  static generateTags(companyName, indicators, dates, data) {
    const tags = new Set([companyName.toLowerCase()]);
    
    // Добавляем показатели
    indicators.forEach(indicator => tags.add(indicator.toLowerCase()));
    
    // Добавляем годы из дат
    dates.forEach(date => {
      if (date.includes('.')) {
        const year = date.split('.').pop();
        if (year.length === 4) tags.add(year);
      } else {
        tags.add(date);
      }
    });

    return Array.from(tags);
  }

  static createEmptyResult(sheetName) {
    return {
      companyName: '',
      dates: [],
      indicators: [],
      data: [],
      metadata: {
        statistics: {
          rowCount: 0,
          columnCount: 0,
          processedAt: new Date()
        },
        tagging: {
          tags: [],
          tagCount: 0
        }
      },
      sheetName,
      totalRows: 0,
      totalColumns: 0
    };
  }

  static parse(filePath) {
    return this.processFile(filePath);
  }
}

module.exports = ExcelProcessor;

