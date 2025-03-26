"use strict";

const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../../utils/excelProcessor');

describe('File Processing Integration Test', () => {
  const testDir = path.join(__dirname, '..', 'test-files');
  const testFilePath = path.join(testDir, 'integration-test.xlsx');

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const wsData = [
      ['Компания XYZ', '2020', '2021', '2022'],
      ['Revenue', '1000.50', '2000.75', '3000.25'],
      ['EBITDA', '500.25', '', '1500.50'],
      ['Net Profit', '250.75', '300.00', 'N/A']
    ];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, testFilePath);
  });

  it('should correctly parse different data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const revenueRow = result.data.find(row => row.row.get('indicator') === 'Revenue');
    expect(revenueRow.row.get('values').get('2020')).to.equal(1000.50);
  });

  it('should handle empty and invalid values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const ebitdaRow = result.data.find(row => row.row.get('indicator') === 'EBITDA');
    expect(ebitdaRow.row.get('values').get('2021')).to.equal('');
  });

  it('should generate appropriate tags', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.metadata.tagging.tags).to.include('revenue');
    expect(result.metadata.tagging.tags).to.include('ebitda');
    expect(result.metadata.tagging.tags).to.include('2020');
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


