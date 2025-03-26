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

  before(async () => {
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

  after(async () => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await disconnectDB();
  });

  it('should upload file and save with correct tags', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', testFilePath);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('data');
    expect(response.body).to.have.property('metadata');
    expect(response.body.metadata.tagging.tags).to.include('выручка');
    expect(response.body.metadata.tagging.tags).to.include('ebitda');
    expect(response.body.metadata.tagging.tags).to.include('2020');
  });

  after(async () => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await db.disconnect();
  });
});


