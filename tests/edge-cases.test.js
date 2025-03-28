// tests/edge-cases.test.js

const { expect } = require('chai');
const ExcelProcessor = require('../utils/excelProcessor');
const path = require('path');

describe('Edge Cases Testing', () => {
  const testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');

  it('should handle empty rows', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const emptyRow = block.content.rows.find(row => 
      Array.from(row.cells.values()).every(cell => !cell.value)
    );
    expect(emptyRow).to.exist;
  });

  it('should trim headers and values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    block.content.headers.forEach(header => {
      expect(header.value).to.equal(header.value.trim());
    });
  });

  it('should handle very long values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const longValueCell = Array.from(block.content.rows[0].cells.values())
      .find(cell => cell.value && cell.value.length > 100);
    expect(longValueCell).to.exist;
  });

  it('should handle special characters', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const specialCharCell = Array.from(block.content.rows[0].cells.values())
      .find(cell => /[!@#$%^&*(),.?":{}|<>]/.test(cell.value));
    expect(specialCharCell).to.exist;
  });

  it('should validate data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const types = new Set();
    block.content.rows.forEach(row => {
      row.cells.forEach(cell => {
        if (cell.type) types.add(cell.type);
      });
    });
    expect(types.size).to.be.at.least(2);
  });
});


