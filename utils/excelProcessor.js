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
    const companyName = this.sanitizeValue(rawData[0][0]);
    const dates = rawData[0].slice(1).map(date => date.toString().trim());
    const indicators = [];
    const data = [];
    const tags = new Set([companyName.toLowerCase()]);

    // Определяем формат дат
    const format = this.determineDateFormat(dates);

    // Обработка строк с данными
    for (let i = 1; i < rawData.length; i++) {
      const rowArray = rawData[i];
      if (!rowArray) continue;

      const indicator = this.sanitizeValue(rowArray[0]);
      if (!indicator) continue;

      indicators.push(indicator);
      tags.add(indicator.toLowerCase());

      // Создаем вложенные Map'ы как ожидают тесты
      const rowMap = new Map();
      const valuesMap = new Map();

      dates.forEach((date, j) => {
        let value = this.sanitizeValue(rowArray[j + 1]);
        // Для числовых значений сохраняем как числа
        if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value)) {
          value = parseFloat(value.replace(',', '.'));
        }
        valuesMap.set(date, value);
        
        // Добавляем теги для дат
        if (date.includes('.')) {
          const year = date.split('.').pop();
          if (year.length === 4) tags.add(year);
        } else {
          tags.add(date);
        }
      });

      // Устанавливаем значения в row Map как ожидают тесты
      rowMap.set('indicator', indicator);
      rowMap.set('values', valuesMap);

      data.push({
        rowNumber: i,
        row: rowMap,  // Сохраняем структуру для тестов
        indicator,    // Дублируем для MongoDB
        values: valuesMap,  // Дублируем для MongoDB
        tags: Array.from(tags)
      });
    }

    const result = {
      companyName,
      dates,
      indicators,
      data,
      metadata: {
        format,
        statistics: {
          rowCount: data.length,
          columnCount: dates.length,
          processedAt: new Date()
        },
        tagging: {
          tags: Array.from(tags),
          tagCount: tags.size
        }
      },
      sheetName
    };

    return result;
  }

  static sanitizeValue(value) {
    if (value === null || value === undefined) return '';
    
    const str = value.toString().trim();
    if (!str) return '';

    return str;
  }

  static determineDateFormat(dates) {
    if (!dates || !dates.length) return 'monthly'; // По умолчанию monthly
    
    const firstDate = dates[0].toString();
    
    // Для формата YYYY
    if (/^\d{4}$/.test(firstDate)) {
      return 'yearly';
    }
    
    // Для формата MM.YYYY или DD.MM.YYYY
    if (firstDate.includes('.')) {
      const parts = firstDate.split('.');
      // Если два компонента (MM.YYYY)
      if (parts.length === 2) {
        return 'monthly';
      }
      // Если три компонента (DD.MM.YYYY), но первый компонент всегда '01'
      if (parts.length === 3 && parts[0] === '01') {
        return 'monthly';
      }
      // Если три компонента и первый не '01'
      if (parts.length === 3) {
        return 'daily';
      }
    }
    
    return 'monthly'; // По умолчанию используем monthly
  }
    

  static createEmptyResult(sheetName) {
    return {
      companyName: '',
      dates: [],
      indicators: [],
      data: [],
      metadata: {
        format: 'unknown',
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
      sheetName
    };
  }

  static parse(filePath) {
    return this.processFile(filePath);
  }
}

// Экспортируем и класс, и его статические методы
module.exports = ExcelProcessor;
module.exports.parse = ExcelProcessor.parse;


