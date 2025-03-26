"use strict";

const { expect } = require('chai');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const app = require('../../server');
const { connectDB, disconnectDB } = require('../../config/db');

describe('File Upload Integration Test', () => {
  const testDir = path.join(__dirname, '..', 'test-files');
  const testFilePath = path.join(testDir, 'upload-test.xlsx');

  before(async function() {
    this.timeout(10000);
    await connectDB();
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Тестовая компания', '2020', '2021', '2022'],
      ['Выручка', '1000.50', '2000.75', '3000.25'],
      ['EBITDA', '500.25', '750.50', '1000.75'],
      ['Прибыль', '250.75', '400.00', '600.25']
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, testFilePath);
  });

  it('should upload file and save with correct tags', async function() {
    this.timeout(5000);
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);

    expect(response.status).to.equal(200);
    expect(response.body.data).to.exist;
    expect(response.body.data.metadata).to.exist;
    expect(response.body.data.tags).to.exist;
  });

  after(async function() {
    this.timeout(5000);
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await disconnectDB();
  });
});


