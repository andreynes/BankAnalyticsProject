"use strict";

const { expect } = require('chai');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const app = require('../server');

describe('File Upload API', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFilePath = path.join(testDir, 'upload-api-test.xlsx');

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Тестовая компания', '2020', '2021'],
      ['Выручка', '1000.50', '2000.75'],
      ['EBITDA', '500.25', '750.50']
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, testFilePath);
  });

  it('should upload an Excel file successfully', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('data');
    expect(response.body.data[0].row.get('indicator')).to.equal('Выручка');
  });

  it('should handle large files appropriately', async () => {
    // Создаем большой файл
    const wb = xlsx.utils.book_new();
    const wsData = [['Большая компания', '2020', '2021']];
    for (let i = 0; i < 1000; i++) {
      wsData.push([`Показатель ${i}`, i * 1000, i * 2000]);
    }
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const largeFilePath = path.join(testDir, 'large-test.xlsx');
    xlsx.writeFile(wb, largeFilePath);

    const response = await request(app)
      .post('/api/upload')
      .attach('file', largeFilePath);

    expect(response.status).to.equal(200);
    fs.unlinkSync(largeFilePath);
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


