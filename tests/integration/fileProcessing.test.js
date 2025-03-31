// tests/integration/fileProcessing.test.js

const { expect } = require('chai');
const ExcelProcessor = require('../../utils/excelProcessor');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

describe('File Processing Integration Test', () => {
  let testFilePath;

  before(() => {
    testFilePath = path.join(__dirname, '../test-files/test.xlsx');
    if (!fs.existsSync(path.dirname(testFilePath))) {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }

    const workbook = xlsx.utils.book_new();
    const data = [
      ['Company Name', '2022', '2023'],
      ['Revenue', 1000000, 1200000],
      ['Profit', 300000, 350000],
      ['Margin', '30%', '29.2%'],
      ['', '', ''],  // Пустая строка
      ['Notes', 'Special chars: @#$%', 'Very long text '.repeat(20)]
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

  it('should correctly parse different data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    
    const types = new Set();
    block.content.rows.forEach(row => {
      row.cells.forEach(cell => types.add(cell.type));
    });

    expect(types.has('number')).to.be.true;
    expect(types.has('percentage')).to.be.true;
    expect(types.has('text')).to.be.true;
  });

  it('should handle empty and invalid values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    
    const emptyCell = Array.from(block.content.rows)
      .find(row => Array.from(row.cells.values())
        .some(cell => cell.type === 'empty'));
    
    expect(emptyCell).to.exist;
  });

  it('should generate appropriate tags', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.globalTags).to.include('2022');
    expect(result.globalTags).to.include('2023');
    expect(result.globalTags).to.include('revenue');
  });
});


