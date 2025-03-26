"use strict";

const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../utils/excelProcessor');

describe('ExcelParser', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFilePath = path.join(testDir, 'parser-test.xlsx');

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

  it('should parse Excel file successfully', async () => {
    const result = await ExcelProcessor.parse(testFilePath);
    expect(result).to.have.property('companyName', 'Тестовая компания');
    expect(result.dates).to.deep.equal(['2020', '2021']);
    expect(result.indicators).to.deep.equal(['Выручка', 'EBITDA']);
  });

  it('should validate parsed data correctly', async () => {
    const result = await ExcelProcessor.parse(testFilePath);
    const revenueRow = result.data.find(row => row.row.get('indicator') === 'Выручка');
    expect(revenueRow.row.get('values').get('2020')).to.equal(1000.50);
    expect(revenueRow.row.get('values').get('2021')).to.equal(2000.75);
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


