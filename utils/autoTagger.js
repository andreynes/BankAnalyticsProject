'use strict';


class AutoTagger {
  constructor() {
    this.commonTags = new Set();
  }


  analyzeTags(input) {
    const { headers, data } = input;
    const tags = new Set();


    // Добавляем заголовки как базовые теги
    headers.forEach(header => {
      tags.add(header.toLowerCase());
      
      // Добавляем дополнительные теги на основе типа данных
      const headerLower = header.toLowerCase();
      if (headerLower.includes('дата')) {
        tags.add('date');
        tags.add('temporal');
      }
      if (headerLower.includes('сумма')) {
        tags.add('amount');
        tags.add('numeric');
      }
      if (headerLower.includes('клиент')) {
        tags.add('client');
        tags.add('organization');
      }
    });


    // Анализируем данные
    data.forEach(row => {
      headers.forEach(header => {
        const value = row.row.get(header);
        if (!value) return;


        // Добавляем значение как тег
        const valueStr = value.toString().toLowerCase();
        tags.add(valueStr);


        // Анализируем типы данных
        if (this.looksLikeDate(value)) {
          tags.add('date');
          tags.add(value.split('-')[0]); // Год как тег
        }
        if (this.looksLikeMoney(value)) {
          tags.add('money');
          if (parseFloat(value) > 1000) {
            tags.add('large_amount');
          }
        }
        if (this.looksLikeOrganization(value)) {
          tags.add('organization');
          if (value.toLowerCase().includes('ооо')) {
            tags.add('company');
          }
          if (value.toLowerCase().includes('ип')) {
            tags.add('entrepreneur');
          }
        }
      });
    });


    return Array.from(tags);
  }


  looksLikeDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }


  looksLikeMoney(value) {
    return /^\d+(\.\d{2})?$/.test(value);
  }


  looksLikeOrganization(value) {
    const str = value.toLowerCase();
    return str.includes('ооо') || str.includes('ип') || str.includes('зао') || str.includes('пао');
  }


  analyzeDataContent(data) {
    const contentTags = new Set();
    
    data.forEach(item => {
      if (typeof item === 'string') {
        // Анализ текстовых данных
        const words = item.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2) { // Игнорируем короткие слова
            contentTags.add(word);
          }
        });
      } else if (typeof item === 'number') {
        // Анализ числовых данных
        contentTags.add('numeric');
        if (item > 1000) contentTags.add('large_value');
        if (item < 0) contentTags.add('negative_value');
      }
    });


    return Array.from(contentTags);
  }
}


module.exports = AutoTagger;



