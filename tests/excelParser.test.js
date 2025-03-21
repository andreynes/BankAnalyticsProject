const { expect } = require('chai');
const ExcelParser = require('../utils/excelParser');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

describe('ExcelParser', () => {
    const testDir = path.join(__dirname, 'test-files');
    const testFilePath = path.join(testDir, 'test-parser.xlsx');

    before(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Создаем тестовый файл
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Имя', 'Возраст', 'Город'],
            ['Иван', 25, 'Москва'],
            ['Мария', 30, 'Санкт-Петербург']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should parse Excel file successfully', async () => {
        const result = await ExcelParser.parse(testFilePath);
        expect(result.success).to.be.true;
        expect(result.fileName).to.equal('test-parser.xlsx');
        expect(result.metadata.totalRows).to.equal(3);
        expect(result.metadata.totalColumns).to.equal(3);
    });

    it('should validate parsed data correctly', async () => {
        const result = await ExcelParser.parse(testFilePath);
        const validation = ExcelParser.validateData(result);
        expect(validation.isValid).to.be.true;
        expect(validation.errors).to.be.empty;
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});