// tests/integration/upload.integration.test.js


const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const db = require('../../config/db');
const app = require('../../server');
const Data = require('../../models/Data');
const xlsx = require('xlsx');


describe('File Upload Integration Test', () => {
  let testFilePath;
  let largeTestFilePath;


  before(async () => {
    await db.connect();
    
    // Создаем директорию для тестовых файлов
    const testDir = path.join(__dirname, '../test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }


    // Создаем тестовые файлы
    testFilePath = path.join(testDir, 'upload-test.xlsx');
    largeTestFilePath = path.join(testDir, 'upload-api-test.xlsx');
    
    createTestExcelFile(testFilePath);
    createLargeTestExcelFile(largeTestFilePath);
  });


  after(async () => {
    // Очищаем тестовые данные
    await Data.deleteMany({});
    
    // Удаляем тестовые файлы
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(largeTestFilePath)) {
      fs.unlinkSync(largeTestFilePath);
    }


    // Очищаем папку uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.includes('test')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }


    await db.disconnect();
  });


  beforeEach(async () => {
    await Data.deleteMany({});
  });


  it('should upload file and save with correct tags', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);


    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('success', true);
    expect(response.body).to.have.property('data');
    expect(response.body.data).to.have.property('_id');
    expect(response.body.data).to.have.property('tags').that.is.an('array');
    
    // Проверяем сохранение в базе
    const savedData = await Data.findById(response.body.data._id);
    expect(savedData).to.exist;
    expect(savedData.documentType).to.equal('excel');
    expect(savedData.fileName).to.include('upload-test.xlsx');
  });


  it('should handle large files correctly', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', largeTestFilePath);


    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('success', true);
    expect(response.body.data).to.have.property('metadata');
    expect(response.body.data.metadata).to.have.property('statistics');
    expect(response.body.data.metadata.statistics.rowCount).to.be.above(100);
  });


  it('should reject invalid file types', async () => {
    const invalidFilePath = path.join(__dirname, '../test-files/invalid.txt');
    fs.writeFileSync(invalidFilePath, 'Invalid content');


    try {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', invalidFilePath);


      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error');
    } finally {
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });


  it('should handle missing file', async () => {
    const response = await request(app)
      .post('/api/upload')
      .send({}); // Отправка без файла


    expect(response.status).to.equal(400);
    expect(response.body).to.have.property('success', false);
    expect(response.body).to.have.property('error');
  });


  it('should process complex data structure correctly', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);


    expect(response.status).to.equal(200);
    expect(response.body.data).to.have.property('blocks').that.is.an('array');
    expect(response.body.data.blocks[0]).to.have.property('content');
    expect(response.body.data.blocks[0].content).to.have.property('headers');
    expect(response.body.data.blocks[0].content).to.have.property('rows');
  });


  it('should generate appropriate tags', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);


    expect(response.status).to.equal(200);
    expect(response.body.data).to.have.property('globalTags').that.is.an('array');
    expect(response.body.data.globalTags).to.include('revenue');
    expect(response.body.data.globalTags).to.include('2023');
  });


  it('should handle concurrent uploads', async () => {
    const uploadPromises = [
      request(app).post('/api/upload').attach('file', testFilePath),
      request(app).post('/api/upload').attach('file', testFilePath)
    ];


    const responses = await Promise.all(uploadPromises);
    
    responses.forEach(response => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('success', true);
    });


    // Проверяем, что оба файла сохранились
    const savedCount = await Data.countDocuments();
    expect(savedCount).to.equal(2);
  });
});


// Вспомогательная функция для создания тестового Excel файла
function createTestExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  
  // Создаем данные для листа
  const data = [
    ['Company Name', '2022', '2023'],
    ['Revenue', 1000000, 1200000],
    ['Profit', 300000, 350000],
    ['Employees', 100, 120]
  ];


  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Financial Data');


  // Добавляем второй лист с другой структурой
  const data2 = [
    ['Department', 'Manager', 'Budget'],
    ['Sales', 'John Doe', 500000],
    ['Marketing', 'Jane Smith', 300000]
  ];


  const worksheet2 = xlsx.utils.aoa_to_sheet(data2);
  xlsx.utils.book_append_sheet(workbook, worksheet2, 'Departments');


  xlsx.writeFile(workbook, filePath);
}


// Вспомогательная функция для создания большого тестового файла
function createLargeTestExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  const data = [['Date', 'Product', 'Revenue', 'Units']];


  // Генерируем 200 строк данных
  for (let i = 1; i <= 200; i++) {
    data.push([
      `2023-${String(Math.floor(i/20) + 1).padStart(2, '0')}-01`,
      `Product ${i}`,
      Math.floor(Math.random() * 10000),
      Math.floor(Math.random() * 100)
    ]);
  }


  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
  xlsx.writeFile(workbook, filePath);
}



