const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../../utils/excelProcessor');

describe('File Processing Integration Test', () => {
    const testDir = path.join(__dirname, '..', 'test-files');
    const testFilePath = path.join(testDir, 'test-processing.xlsx');

    before(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата операции', 'Клиент', 'Сумма продажи', 'Количество', 'Примечание'],
            ['2024-03-21', 'ООО "Тест"', '1000.50', '5', 'Тестовая запись'],
            ['2024-03-22', 'ИП Иванов', '2000.75', '', ''],
            [null, undefined, '0', '10', 'Специальные символы: !@#$%']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should correctly parse different data types', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const firstRow = result.data[0];
        
        expect(firstRow.row.get('Дата операции')).to.equal('2024-03-21');
        expect(firstRow.row.get('Сумма продажи')).to.equal('1000.50');
        expect(firstRow.row.get('Количество')).to.equal('5.00');
    });

    it('should handle empty and invalid values', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const emptyRow = result.data[2];
        
        expect(emptyRow.row.get('Дата операции')).to.equal('');
        expect(emptyRow.row.get('Клиент')).to.equal('');
    });

    it('should handle numeric formatting consistently', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const secondRow = result.data[1];
        
        expect(secondRow.row.get('Сумма продажи')).to.equal('2000.75');
    });

    it('should preserve special characters in text', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const specialRow = result.data[2];
        
        expect(specialRow.row.get('Примечание')).to.include('!@#$%');
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});

