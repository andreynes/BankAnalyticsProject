"use strict";

const AutoTagger = require('./autoTagger');

class TagAssigner {
  constructor() {
    this.autoTagger = new AutoTagger();

    // Бизнес-правила на основе финансовых порогов.
    this.businessRules = {
      highRevenue: {
        condition: (indicator, value) => {
          if (/выручка|revenue/i.test(indicator)) {
            return value > 1000000;
          }
          return false;
        },
        tag: 'высокая_выручка'
      },
      highProfit: {
        condition: (indicator, value) => {
          if (/прибыль|profit/i.test(indicator)) {
            return value > 500000;
          }
          return false;
        },
        tag: 'крупная_прибыль'
      },
      negativeValue: {
        condition: (indicator, value) => {
          return value < 0;
        },
        tag: 'отрицательная_прибыль'
      },
      emptyData: {
        condition: (indicator, value) => {
          return value === null || value === undefined || value === '';
        },
        tag: 'неполные_данные'
      }
    };

    // Категории для группировки тегов.
    this.categories = {
      'финансы': ['выручка', 'прибыль', 'ebitda'],
      'результаты': ['рост', 'снижение']
    };
  }

  /**
   * Метод assignTags принимает объект data и обрабатывает его.
   * Добавлены проверки и логирование пустых данных для диагностики.
   */
  assignTags(data) {
    // Проверяем наличие входного объекта и sheetData.
    if (!data) {
      console.error("assignTags: входной объект data отсутствует.");
      return data;
    }
    if (!data.sheetData || !Array.isArray(data.sheetData) || data.sheetData.length === 0) {
      console.error("assignTags: sheetData отсутствует или пустое:", data.sheetData);
      return data;
    }
    if (!Array.isArray(data.sheetData[0])) {
      console.error("assignTags: заголовок (первый элемент sheetData) не является массивом:", data.sheetData[0]);
      return data;
    }
    
    console.log("assignTags – исходные данные:", JSON.stringify(data.sheetData, null, 2));

    // Если sheetData имеет формат Map (data.data), восстанавливаем его
    if ((!data.sheetData || !Array.isArray(data.sheetData)) &&
        data.data &&
        data.data.length > 0 &&
        data.data[0].row &&
        typeof data.data[0].row.get === "function") {
      let reconstructed = [];
      const headers = Array.from(data.data[0].row.keys());
      reconstructed.push(headers);
      data.data.forEach(item => {
        let row = [];
        headers.forEach(header => {
          row.push(item.row.get(header) || "");
        });
        reconstructed.push(row);
      });
      data.sheetData = reconstructed;
      console.log("Reconstructed sheetData:", JSON.stringify(data.sheetData, null, 2));
    }
    
    // Преобразуем sheetData в массив rows
    const header = data.sheetData[0];
    let rows = [];
    for (let i = 1; i < data.sheetData.length; i++) {
      let row = data.sheetData[i];
      if (!Array.isArray(row) || row.length === 0) {
        console.warn(`assignTags: пропускается пустая строка на позиции ${i}`);
        continue;
      }
      if (row[0] === undefined) {
        console.warn(`assignTags: пропускается строка без label на позиции ${i}`);
        continue;
      }
      rows.push({ label: row[0], values: row.slice(1) });
    }
    console.log("assignTags – сформированные rows:", JSON.stringify(rows, null, 2));

    let basicTags = new Set();
    // Добавляем название компании из заголовка, если имеется
    if (data.sheetData[0] && data.sheetData[0][0]) {
      basicTags.add(data.sheetData[0][0].toString().toLowerCase().replace(/\s+/g, '_'));
    }

    // Получаем базовые теги от AutoTagger
    const autoTags = this.autoTagger.analyzeTags({ rows: rows });
    console.log("assignTags – AutoTagger вернул теги:", JSON.stringify(autoTags, null, 2));
    autoTags.forEach(tag => basicTags.add(tag));

    let indicatorTags = new Set();
    for (let row of rows) {
      if (!row || !row.label || !Array.isArray(row.values)) continue;
      for (let val of row.values) {
        let numericVal = this.parseNumeric(val);
        Object.values(this.businessRules).forEach(rule => {
          if (rule.condition(row.label, numericVal)) {
            indicatorTags.add(rule.tag);
          }
        });
      }
      const indicatorStr = row.label.toString().toLowerCase();
      Object.entries(this.categories).forEach(([category, keywords]) => {
        if (keywords.some(keyword => indicatorStr.includes(keyword.toLowerCase()))) {
          indicatorTags.add(category);
        }
      });
    }
    indicatorTags.forEach(tag => basicTags.add(tag));

    const metadata = {
      tags: Array.from(basicTags)
    };

    console.log("assignTags – итоговые теги:", JSON.stringify(metadata.tags, null, 2));

    return {
      ...data,
      metadata: {
        ...(data.metadata || {}),
        tagging: metadata
      }
    };
  }

  // Преобразует значение в число; если не удается, возвращает 0.
  parseNumeric(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    try {
      let normalized = value.toString().trim().replace(/\s+/g, '');
      normalized = normalized.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = TagAssigner;


