"use strict";

const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../utils/excelProcessor');

describe('Edge Cases Testing', () => {
  const testDir = path.join(__dirname, 'test-files');
  const testFilePath = path.join(testDir, 'edge-cases.xlsx');

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Создаем файл с граничными случаями
    const wb = xlsx.utils.book_new();
    const wsData = [
      ['Полипласт', '2020', '2021', '2022', '2023'],
      ['Выручка', '1000.50', '2000.75', '', '12345.67'],
      ['EBITDA', '', ' ', 'not_a_number', '-1000'],
      ['Прибыль', 'a'.repeat(1000), '!@#$%^&*()', '特殊文字', '✓']
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, testFilePath);
  });

  it('should handle empty rows', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const emptyRow = result.blocks[0].content.rows.find(row =>
        Object.values(row.cells).every(cell => !cell.value)
    );
    expect(emptyRow).to.exist;
  });

  it('should trim headers and values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const ebitdaRow = result.data.find(row => row.row.get('indicator') === 'EBITDA');
    expect(ebitdaRow.row.get('values').get('2021')).to.equal('');
  });

  it('should handle very long values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const profitRow = result.data.find(row => row.row.get('indicator') === 'Прибыль');
    const longValue = profitRow.row.get('values').get('2020');
    expect(longValue.length).to.equal(1000);
  });

  it('should handle special characters', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const profitRow = result.data.find(row => row.row.get('indicator') === 'Прибыль');
    expect(profitRow.row.get('values').get('2021')).to.equal('!@#$%^&*()');
    expect(profitRow.row.get('values').get('2022')).to.equal('特殊文字');
    expect(profitRow.row.get('values').get('2023')).to.equal('✓');
  });

  it('should validate data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.companyName).to.equal('Полипласт');
    expect(result.dates).to.deep.equal(['2020', '2021', '2022', '2023']);
    expect(result.indicators).to.deep.equal(['Выручка', 'EBITDA', 'Прибыль']);
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


