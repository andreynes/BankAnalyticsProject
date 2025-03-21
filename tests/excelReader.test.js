const { expect } = require('chai');
const ExcelReader = require('../utils/excelReader');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

describe('ExcelReader', () => {
    const testDir = path.join(__dirname, 'test-files');
    const testFilePath = path.join(testDir, 'test.xlsx');
    let reader;

    before(() => {
        // Создаем тестовую директорию и файл
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Создаем тестовый Excel файл
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Name', 'Age', 'City'],
            ['John', 25, 'New York'],
            ['Jane', 30, 'London']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);

        reader = new ExcelReader(testFilePath);
    });

    it('should load Excel file successfully', () => {
        expect(reader.load()).to.be.true;
    });

    it('should get sheet names', () => {
        reader.load();
        const sheets = reader.getSheetNames();
        expect(sheets).to.be.an('array');
        expect(sheets).to.include('Sheet1');
    });

    it('should read sheet data correctly', () => {
        reader.load();
        const data = reader.readSheet('Sheet1');
        expect(data.totalRows).to.equal(3);
        expect(data.totalColumns).to.equal(3);
        expect(data.headers).to.deep.equal(['Name', 'Age', 'City']);
    });

    it('should analyze content correctly', () => {
        reader.load();
        const analysis = reader.analyzeContent();
        expect(analysis.totalSheets).to.equal(1);
        expect(analysis.sheets[0].rowCount).to.equal(3);
        expect(analysis.sheets[0].columnCount).to.equal(3);
    });

    after(() => {
        // Удаляем тестовый файл
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        reader.cleanup();
    });
});