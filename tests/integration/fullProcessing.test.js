"use strict";

const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../../utils/excelProcessor');

describe('Full Excel Processing Integration', () => {
  const testDir = path.join(__dirname, '..', 'test-files');
  const testFilePath = path.join(testDir, 'full-test.xlsx');

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Полипласт', '2020', '2021', '2022', '01.01.2023', '01.02.2023'],
      ['Выручка', '1000.50', '2000.75', '3000.25', '4000.00', '5000.00'],
      ['EBITDA', '500.25', '750.50', '1000.75', '1250.00', '1500.00'],
      ['Чистая прибыль', '250.75', '400.00', '600.25', '800.50', '1000.00'],
      ['Рентабельность', '25%', '20%', '20%', '20%', '20%']
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, testFilePath);
  });

  it('should process complex Excel file with different data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const revenueRow = result.data.find(row => row.row.get('indicator') === 'Выручка');
    expect(revenueRow.row.get('values').get('2020')).to.equal(1000.50);
  });

  it('should handle different date formats', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.dates).to.include('01.01.2023');
    expect(result.dates).to.include('01.02.2023');
  });

  it('should generate appropriate tags', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const tags = result.metadata.tagging.tags;
    expect(tags).to.include('выручка');
    expect(tags).to.include('ebitda');
    expect(tags).to.include('2020');
    expect(tags).to.include('полипласт');
  });

  it('should handle percentage values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const rentRow = result.data.find(row => row.row.get('indicator') === 'Рентабельность');
    expect(rentRow.row.get('values').get('2020')).to.equal('25%');
  });

  it('should process all indicators correctly', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.indicators).to.have.length(4);
    expect(result.indicators).to.include('Выручка');
    expect(result.indicators).to.include('EBITDA');
    expect(result.indicators).to.include('Чистая прибыль');
    expect(result.indicators).to.include('Рентабельность');
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


