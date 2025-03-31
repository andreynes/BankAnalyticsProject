// tests/excelParser.test.js

const { ExcelParser, ExcelProcessor } = require('../utils/excelParser');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

describe('ExcelParser', () => {
  let testFilePath;

  before(() => {
    testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');
    if (!fs.existsSync(path.dirname(testFilePath))) {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }
    
    // Создаем тестовый файл
    const xlsx = require('xlsx');
    const workbook = xlsx.utils.book_new();
    const data = [
      ['Company Name', '2022', '2023'],
      ['Revenue', 1000000, 1200000],
      ['Profit', 300000, 350000],
      ['Margin', '30%', '29.2%']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Test Data');
    xlsx.writeFile(workbook, testFilePath);
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should parse Excel file successfully', async () => {
    const result = await ExcelParser.parse(testFilePath);
    
    expect(result.headers).to.be.an('array');
    expect(result.data).to.be.an('array');
    expect(result.metadata.statistics).to.have.proprerty('rowCount');
    expect(result.metadata.statistics).to.have.proprerty('columnCount');
  });

  it('should validate parsed data correctly', async () => {
    const result = await ExcelParser.parse(testFilePath);
    const firstRow = result.data[0];
    
    expect(firstRow).to.have.property('rowNumber', 1);
    expect(firstRow).to.be.instanceOf(Map);
    expect(Array.from(firstRow.row.values())).to.include('1000000');
  });
});


