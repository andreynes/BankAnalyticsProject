'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { expect } = require('chai');
const connectDB = require('../config/db');
const Data = require('../models/Data');

describe('Data Model Test', function() {
  // Увеличиваем таймаут до 10 секунд
  this.timeout(10000);

  before(async function() {
    await connectDB();
  });

  after(async function() {
    try {
      // Попытка удалить коллекцию 'datas'. Если коллекция отсутствует, игнорируем ошибку.
      await mongoose.connection.dropCollection('datas');
    } catch (err) {
      // Игнорируем ошибку, если коллекция не найдена.
    }
    await mongoose.disconnect();
  });

  it('should validate valid data', async function() {
    // Создаем тестовый документ с заполненными полями, включая metadata.statistics
    const testData = new Data({
      fileName: 'test.xlsx',
      uploadDate: new Date(),
      data: [],
      tags: ['Петров', 'Полипласт', 'Выручка'],
      metadata: {
        sheetName: 'Sheet1',
        totalRows: 0,
        totalColumns: 0,
        processedAt: new Date(),
        fileSize: 0,
        statistics: {
          emptyValues: 0,
          numericalColumns: ['Сумма продажи'],
          categoricalColumns: [],
          uniqueValuesCount: {}
        }
      },
      status: 'processed',
      lastModified: new Date()
    });

    const savedData = await testData.save();
    expect(savedData.fileName).to.equal('test.xlsx');
  });
});

