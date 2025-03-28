// tests/integration/fileProcessing.test.js

const { expect } = require('chai');
const ExcelProcessor = require('../../utils/excelProcessor');
const path = require('path');

describe('File Processing Integration Test', () => {
  const testFilePath = path.join(__dirname, '../test-files/test.xlsx');

  it('should correctly parse different data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const types = new Set();
    
    block.content.rows.forEach(row => {
      row.cells.forEach(cell => types.add(cell.type));
    });

    expect(types.has('number')).to.be.true;
    expect(types.has('text')).to.be.true;
  });

  it('should handle empty and invalid values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    
    const hasEmptyValue = block.content.rows.some(row =>
      Array.from(row.cells.values()).some(cell => cell.type === 'empty')
    );
    
    expect(hasEmptyValue).to.be.true;
  });

  it('should generate appropriate tags', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.globalTags).to.be.an('array');
    expect(result.globalTags.length).to.be.above(0);
    expect(result.globalTags).to.include('2023');
  });
});




