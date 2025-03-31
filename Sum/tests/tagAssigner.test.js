'use strict';

const { expect } = require('chai');
const AutoTagger = require('../utils/autoTagger');

describe('AutoTagger', () => {
  let tagger;
  
  beforeEach(() => {
    tagger = new AutoTagger();
  });
  
  it('should assign tags based on provided headers and data', () => {
    // Пример входных данных
    const input = {
      headers: ['Дата операции', 'Сумма продажи', 'Клиент'],
      data: [
        {
          rowNumber: 1,
          row: new Map([
            ['Дата операции', '2023-09-01'],
            ['Сумма продажи', '1000.50'],
            ['Клиент', 'ООО Рога и Копыта']
          ])
        },
        {
          rowNumber: 2,
          row: new Map([
            ['Дата операции', '2023-09-02'],
            ['Сумма продажи', '2000.75'],
            ['Клиент', 'ИП Иванов']
          ])
        }
      ]
    };
    
    const tags = tagger.analyzeTags(input);
    
    // Проверяем, что возвращается массив тегов
    expect(tags).to.be.an('array');
    // Проверяем, что массив не пустой
    expect(tags.length).to.be.above(0);
    // При необходимости можно добавить дополнительные проверки,
    // например, на содержание конкретного тега, если логика tagger это предусматривает.
  });
});

