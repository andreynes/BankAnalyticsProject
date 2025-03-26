"use strict";

const AutoTagger = require('./autoTagger');

class TagAssigner {
  constructor() {
    this.autoTagger = new AutoTagger();

    // Бизнес-правила для присвоения тегов, зависят от показателя и его значений
    this.businessRules = {
      highRevenue: {
        // Если показатель содержит "выручка" или "revenue" и значение больше 1 млн
        condition: (indicator, value) => {
          if (/выручка|revenue/i.test(indicator)) {
            return value > 1000000;
          }
          return false;
        },
        tag: 'крупная_выручка'
      },
      highProfit: {
        // Если показатель содержит "прибыль" или "profit" и значение больше 500 тыс.
        condition: (indicator, value) => {
          if (/прибыль|profit/i.test(indicator)) {
            return value > 500000;
          }
          return false;
        },
        tag: 'крупная_прибыль'
      },
      negativeValue: {
        // Если значение отрицательное
        condition: (indicator, value) => {
          return value < 0;
        },
        tag: 'отрицательное_значение'
      },
      emptyData: {
        // Если значение пустое или не задано
        condition: (indicator, value) => {
          return value === null || value === undefined || value === '';
        },
        tag: 'пустые_данные'
      }
    };

    // Категории для группировки тегов (расширяем по необходимости)
    this.categories = {
      'финансы': ['выручка', 'прибыль', 'ebitda'],
      'результаты': ['рост', 'снижение']
    };
  }

  /*
   Метод assignTags ожидает объект data со структурой:
   {
     sheetData: [
       [ companyName, date1, date2, ... ],
       [ indicator1, value11, value12, ... ],
       [ indicator2, value21, value22, ... ],
       ...
     ],
     metadata: { ... }
   }
   
   Процесс:
   - Извлекает название компании из первой ячейки заголовка и добавляет его как тег.
   - Вызывает AutoTagger для получения базовых тегов.
   - Для каждой строки (начиная со второй) рассматривает значение показателя (первый элемент строки)
     и его числовые значения (остальные элементы), применяет бизнес-правила и категории.
   - Объединяет все теги и добавляет их в data.metadata.tagging.
   
   Возвращает обновленный объект data.
  */
  assignTags(data) {
    const sheetData = data.sheetData;
    if (!sheetData || sheetData.length < 2) {
      return data;
    }

    const headerRow = sheetData[0];
    const companyName = headerRow[0];
    let basicTags = new Set();

    if (companyName) {
      basicTags.add(companyName.toString().toLowerCase().replace(/\s+/g, '_'));
    }

    // Получаем базовые теги из AutoTagger
    const autoTags = this.autoTagger.analyzeTags(data);
    autoTags.forEach(tag => basicTags.add(tag));

    // Обрабатываем каждую строку показателей (начиная со второй строки)
    let indicatorTags = new Set();
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length < 2) continue;

      const indicator = row[0];
      for (let j = 1; j < row.length; j++) {
        const value = this.parseNumeric(row[j]);
        Object.values(this.businessRules).forEach(rule => {
          if (rule.condition(indicator, value)) {
            indicatorTags.add(rule.tag);
          }
        });

        const indicatorStr = indicator.toString().toLowerCase();
        Object.entries(this.categories).forEach(([category, keywords]) => {
          if (keywords.some(keyword => indicatorStr.includes(keyword.toLowerCase()))) {
            indicatorTags.add(category);
          }
        });
      }
    }

    indicatorTags.forEach(tag => basicTags.add(tag));

    const metadata = {
      tags: Array.from(basicTags)
    };

    return {
      ...data,
      metadata: {
        ...(data.metadata || {}),
        tagging: metadata
      }
    };
  }

  // Приведение значения к числовому типу; если преобразование невозможно, возвращает 0.
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

