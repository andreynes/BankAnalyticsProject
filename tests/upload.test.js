// tests/upload.test.js

const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const { connect, disconnect } = require('../config/db');
const Data = require('../models');

describe('File Upload API', () => {
  let testFilePath;
  let largeTestFilePath;

  before(async function() {
    if (!process.env.MONGODB_URI) {
      console.log('Skipping upload tests - no MongoDB URI provided');
      this.skip();
    }

    try {
      await connect();
      
      // Создаем директорию для тестовых файлов
      const testDir = path.join(__dirname, 'test-files');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Создаем тестовые файлы
      testFilePath = path.join(testDir, 'upload-test.xlsx');
      largeTestFilePath = path.join(testDir, 'large-test.xlsx');
      
      // Создаем тестовый Excel файл
      const workbook = require('xlsx').utils.book_new();
      const data = [
        ['Company Name', '2022', '2023'],
        ['Revenue', 1000000, 1200000],
        ['Profit', 300000, 350000],
        ['Margin', '30%', '29.2%']
      ];
      const worksheet = require('xlsx').utils.aoa_to_sheet(data);
      require('xlsx').utils.book_append_sheet(workbook, worksheet, 'Financial Data');
      require('xlsx').writeFile(workbook, testFilePath);

      // Создаем большой тестовый файл
      const largeData = Array.from({ length: 1000 }, (_, i) => [
        `Row ${i + 1}`,
        Math.random() * 1000000,
        new Date().toISOString()
      ]);
      const largeWorksheet = require('xlsx').utils.aoa_to_sheet(largeData);
      require('xlsx').utils.book_append_sheet(workbook, largeWorksheet, 'Large Data');
      require('xlsx').writeFile(workbook, largeTestFilePath);

    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  after(async function() {
    try {
      // Очищаем тестовые данные
      await Data.deleteMany({});
      
      // Удаляем тестовые файлы
      [testFilePath, largeTestFilePath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      // Очищаем папку uploads
      const uploadsDir = path.join(__dirname, '../uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => {
          if (file.includes('test')) {
            fs.unlinkSync(path.join(uploadsDir, file));
          }
        });
      }

      await disconnect();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  beforeEach(async () => {
    await Data.deleteMany({});
  });

  it('should upload an Excel file successfully', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('fileName');
    expect(response.body.data).to.have.property('documentType', 'excel');
    expect(response.body.data).to.have.property('globalTags').that.is.an('array');
    expect(response.body.data.globalTags).to.include('2023');
    
    // Проверяем сохранение в базе
    const savedData = await Data.findById(response.body.data._id);
    expect(savedData).to.exist;
    expect(savedData.blocks).to.be.an('array');
    expect(savedData.blocks.length).to.be.above(0);
  });

  it('should handle large files', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', largeTestFilePath);

    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
    expect(response.body.data.metadata.statistics.rowCount).to.be.above(100);
  });

  it('should reject invalid file types', async () => {
    const invalidFilePath = path.join(__dirname, 'test-files', 'invalid.txt');
    fs.writeFileSync(invalidFilePath, 'Invalid content');

    try {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', invalidFilePath);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Excel');
    } finally {
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });

  it('should handle missing file', async () => {
    const response = await request(app)
      .post('/api/upload')
      .send({});

    expect(response.status).to.equal(400);
    expect(response.body).to.have.property('error', 'No file uploaded');
  });

  it('should handle file size limits', async () => {
    const largePath = path.join(__dirname, 'test-files', 'too-large.xlsx');
    const largeContent = Buffer.alloc(16 * 1024 * 1024); // 16MB

    fs.writeFileSync(largePath, largeContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largePath);

      expect(response.status).to.equal(413);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('size');
    } finally {
      if (fs.existsSync(largePath)) {
        fs.unlinkSync(largePath);
      }
    }
  });

  it('should preserve file metadata', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);

    expect(response.status).to.equal(200);
    expect(response.body.data.metadata).to.have.property('statistics');
    expect(response.body.data.metadata.statistics).to.have.property('fileSize');
    expect(response.body.data.metadata.statistics).to.have.property('processedAt');
  });

  it('should handle concurrent uploads', async () => {
    const uploadPromises = [
      request(app).post('/api/upload').attach('file', testFilePath),
      request(app).post('/api/upload').attach('file', testFilePath)
    ];

    const responses = await Promise.all(uploadPromises);
    
    responses.forEach(response => {
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });

    const savedCount = await Data.countDocuments();
    expect(savedCount).to.equal(2);
  });
});


