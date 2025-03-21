const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../../utils/excelProcessor');

describe('Full Excel Processing Integration', () => {
    const testDir = path.join(__dirname, '..', 'test-files');
    const testFilePath = path.join(testDir, 'full-test.xlsx');

    before(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата операции', 'Клиент', 'Сумма продажи', 'Количество', 'Статус оплаты'],
            ['2024-03-21', 'ООО "Тест"', '1000.50', '5', 'Оплачено'],
            ['2024-03-22', 'ООО "Специальные знаки (%@#)"', '2000.75', '3', 'В обработке'],
            ['2024-03-23', 'ООО "Тест"', '-500.25', '0', null],
            ['2024-03-24', '', '1234.56', 'не число', 'Отменено']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Операции');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should process complex Excel file with different data types', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result.data[0].row.get('Сумма продажи')).to.equal('1000.50');
    });

    it('should handle special characters and formatting', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result.data[1].row.get('Клиент')).to.include('(%@#)');
    });

    it('should generate appropriate tags', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result.metadata.suggestedTags).to.be.an('array');
        expect(result.metadata.suggestedTags.length).to.be.greaterThan(0);
    });

    it('should handle all rows correctly', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result.data.length).to.equal(4);
    });

    it('should process Excel dates correctly', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const dateValue = result.data[0].row.get('Дата операции');
        expect(dateValue).to.match(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle numeric values consistently', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const sumValue = parseFloat(result.data[0].row.get('Сумма продажи'));
        expect(sumValue).to.equal(1000.50);
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});