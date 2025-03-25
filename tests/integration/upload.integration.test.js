'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { expect } = require('chai');
const request = require('supertest');
const connectDB = require('../../config/db');  // путь: подняться на два уровня
const app = require('../../server');           // убедитесь, что server.js экспортирует Express-приложение

describe('File Upload Integration Test', function() {
  // Увеличиваем таймаут до 10 секунд
  this.timeout(10000);

  before(async function() {
    await connectDB();
  });

  after(async function() {
    await mongoose.disconnect();
  });

  it('should upload file and save with correct tags', async function() {
    const res = await request(app)
      .post('/upload')
      .attach('file', 'tests/test-files/sample.xlsx');  // файл sample.xlsx должен находиться в tests/test-files

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('data');
    // Проверяем, что в ответе в data.metadata присутствует свойство statistics
    expect(res.body.data).to.have.property('metadata');
    expect(res.body.data.metadata).to.have.property('statistics');
    // В statistics проверяем, что numericalColumns является массивом и содержит 'Сумма продажи'
    expect(res.body.data.metadata.statistics).to.have.property('numericalColumns')
      .that.is.an('array');
    expect(res.body.data.metadata.statistics.numericalColumns).to.include('Сумма продажи');
  });
});


