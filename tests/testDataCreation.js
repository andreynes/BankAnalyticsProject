// tests/testDataCreation.js

const Data = require('../models');

/**
 * Создание тестовых данных для базы данных
 * @param {Object} overrides - Переопределения значений по умолчанию
 * @returns {Object} - Объект с тестовыми данными
 */
const createTestData = (overrides = {}) => ({
  fileName: 'test.xlsx',
  documentType: 'excel',
  companyName: 'Test Company',
  globalTags: ['test', '2023'],
  blocks: [{
    type: 'table',
    source: 'excel',
    content: {
      headers: [{ value: 'Test', level: 1 }],
      rows: [{
        rowNumber: 1,
        cells: new Map([['Test', { value: 'Value', type: 'text' }]])
      }]
    },
    tags: ['test']
  }],
  metadata: {
    format: 'yearly',
    statistics: {
      rowCount: 1,
      columnCount: 1,
      processedAt: new Date(),
      fileSize: 1024
    }
  },
  status: 'completed',
  ...overrides
});

/**
 * Создание тестовых данных с несколькими блоками
 * @param {number} blockCount - Количество блоков
 * @returns {Object} - Объект с тестовыми данными
 */
const createMultiBlockTestData = (blockCount = 2) => {
  const blocks = Array.from({ length: blockCount }, (_, index) => ({
    type: 'table',
    source: 'excel',
    content: {
      headers: [{ value: `Test${index + 1}`, level: 1 }],
      rows: [{
        rowNumber: 1,
        cells: new Map([[`Test${index + 1}`, { value: `Value${index + 1}`, type: 'text' }]])
      }]
    },
    tags: [`test${index + 1}`]
  }));

  return createTestData({ blocks });
};

/**
 * Сохранение тестовых данных в базу
 * @param {Object} data - Данные для сохранения
 * @returns {Promise<Object>} - Сохраненный документ
 */
const saveTestData = async (data = createTestData()) => {
  const model = new Data(data);
  return await model.save();
};

/**
 * Создание набора тестовых данных
 * @param {number} count - Количество документов
 * @returns {Promise<Array>} - Массив сохраненных документов
 */
const createTestDataSet = async (count = 5) => {
  const promises = Array.from({ length: count }, (_, index) => 
    saveTestData(createTestData({
      fileName: `test${index + 1}.xlsx`,
      companyName: `Test Company ${index + 1}`
    }))
  );
  return await Promise.all(promises);
};

module.exports = {
  createTestData,
  createMultiBlockTestData,
  saveTestData,
  createTestDataSet
};


