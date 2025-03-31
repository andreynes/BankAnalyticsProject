// tests/integration/fullProcessing.test.js

const { expect } = require('chai');
const ExcelProcessor = require('../../utils/excelProcessor');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

describe('Full Excel Processing Integration', () => {
  let testFilePath;

  before(() => {
    testFilePath = path.join(__dirname, '../test-files/complex-test.xlsx');
    if (!fs.existsSync(path.dirname(testFilePath))) {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }
    
    // Создаем тестовый файл со сложной структурой
    const workbook = xlsx.utils.book_new();
    const data = [
      ['Financial Metrics', '', '', 'Operational Metrics', '', ''],
      ['Revenue', 'Costs', 'Profit', 'Employees', 'Offices', 'Projects'],
      ['Q1 2023', 1000000, 700000, 300000, 100, 5, 20],
      ['Q2 2023', 1100000, 750000, 350000, 110, 5, 22],
      ['Q3 2023', 1200000, 800000, 400000, 120, 6, 25],
      ['Q4 2023', 1300000, 850000, 450000, 130, 6, 28]
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Complex Data');
    xlsx.writeFile(workbook, testFilePath);
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should process complex Excel file with different data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.blocks[0].content.rows).to.have.length.above(0);
    expect(result.globalTags).to.include('2023');
  });

  it('should handle different date formats', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.metadata.format).to.be.oneOf(['yearly', 'monthly', 'daily', 'unknown']);
  });

  it('should generate appropriate tags', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.globalTags).to.be.an('array');
    expect(result.globalTags).to.include('revenue');
    expect(result.globalTags).to.include('2023');
  });

  it('should handle percentage values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const rows = result.blocks[0].content.rows;
    const percentageCell = Array.from(rows[0].cells.values())
      .find(cell => cell.type === 'percentage');
    expect(percentageCell).to.exist;
  });

  it('should process all indicators correctly', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.documentType).to.equal('excel');
    expect(result.blocks[0].content.headers).to.have.length.above(0);
    expect(result.blocks[0].content.rows).to.have.length.above(0);
  });
});


