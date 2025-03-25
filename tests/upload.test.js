// tests/upload.test.js
require('dotenv').config();
const mongoose = require('mongoose');
const { expect } = require('chai');
const request = require('supertest');
const connectDB = require('../config/db');
const app = require('../server');

describe('File Upload API', () => {
  before(async function() {
    this.timeout(10000);
    await connectDB();
  });

  after(async function() {
    await mongoose.disconnect();
  });

  it('should upload an Excel file successfully', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', 'tests/test-files/sample.xlsx'); // убедитесь, что файл sample.xlsx существует
    expect(res.status).to.equal(200);
    // Добавьте дополнительные проверки, если нужно
  });

  it('should handle large files appropriately', async () => {
    // реализация теста или очистка после теста
    // Например, удаление документов из коллекции
    await mongoose.connection.collection('datas').deleteMany({});
  });
});


