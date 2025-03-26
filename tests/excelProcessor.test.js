"use strict";

const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const ExcelProcessor = require("../utils/excelProcessor");

describe("ExcelProcessor Tests", () => {
  const testDir = path.join(__dirname, "test-files");
  const testFilePath = path.join(testDir, "excelProcessorTest.xlsx");

  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const wsData = [
      ['Полипласт', '2020', '2021', '2022'],
      ['Выручка', '1000.50', '2000.75', '3000.25'],
      ['EBITDA', '500.25', '', '1500.50'],
      ['Прибыль', '250.75', '300.00', 'Нет данных']
    ];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    xlsx.writeFile(wb, testFilePath);
  });

  it("should return an object with correct structure", async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result).to.be.an("object");
    expect(result).to.have.property("companyName").that.is.a("string");
    expect(result).to.have.property("dates").that.is.an("array");
    expect(result).to.have.property("indicators").that.is.an("array");
    expect(result).to.have.property("data").that.is.an("array");
    expect(result).to.have.property("metadata").that.is.an("object");
    expect(result).to.have.property("sheetName").that.is.a("string");
  });

  it("should correctly parse company name and dates", async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    expect(result.companyName).to.equal("Полипласт");
    expect(result.dates).to.deep.equal(["2020", "2021", "2022"]);
  });

  it("should correctly process data row values", async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const revenueRow = result.data.find(row => row.row.get('indicator') === 'Выручка');
    expect(revenueRow.row.get('values').get('2020')).to.equal(1000.50);
    expect(revenueRow.row.get('values').get('2021')).to.equal(2000.75);
    expect(revenueRow.row.get('values').get('2022')).to.equal(3000.25);
  });

  it("should handle missing values correctly", async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const ebitdaRow = result.data.find(row => row.row.get('indicator') === 'EBITDA');
    expect(ebitdaRow.row.get('values').get('2021')).to.equal('');
  });

  it("should handle non-numeric values correctly", async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const profitRow = result.data.find(row => row.row.get('indicator') === 'Прибыль');
    expect(profitRow.row.get('values').get('2022')).to.equal('Нет данных');
  });

  after(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});


