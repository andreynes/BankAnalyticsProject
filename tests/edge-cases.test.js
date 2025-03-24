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
            ['Дата операции', 'Клиент', 'Сумма продажи', 'Количество', 'Статус'],
            ['', '', '', '', ''],  // Пустая строка
            [' ', ' ', ' ', ' ', ' '],  // Строка с пробелами
            ['a'.repeat(1000), 'b'.repeat(1000), 'c'.repeat(1000), 'd'.repeat(1000), 'e'.repeat(1000)],  // Длинные значения
            ['!@#$%^&*()', '特殊文字', '12,345.67', '-1000', '✓']  // Специальные символы
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should handle empty rows', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const emptyRow = result.data[0];
        
        for (const [_, value] of emptyRow.row) {
            expect(value).to.equal('');
        }
    });

    it('should trim headers and values', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const spaceRow = result.data[1];
        
        for (const [_, value] of spaceRow.row) {
            expect(value).to.equal('');
        }
    });

    it('should handle very long values', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const longRow = result.data[2];
        
        let foundLongValue = false;
        for (const [_, value] of longRow.row) {
            if (value.length === 1000) {
                foundLongValue = true;
                break;
            }
        }
        expect(foundLongValue, 'Should preserve long values').to.be.true;
    });

    it('should handle special characters', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const specialRow = result.data[3];
        
        const values = Array.from(specialRow.row.values());
        expect(values).to.include('!@#$%^&*()');
        expect(values).to.include('特殊文字');
        expect(values).to.include('✓');
        
        const numValue = parseFloat(specialRow.row.get('Сумма продажи'));
        expect(numValue).to.equal(12345.67);
    });

    it('should validate data types', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        
        expect(result.metadata.columnTypes).to.exist;
        
        const types = result.metadata.columnTypes;
        expect(types.get('Дата операции')).to.equal('date');
        expect(types.get('Сумма продажи')).to.equal('number');
        expect(types.get('Количество')).to.equal('number');
        expect(types.get('Клиент')).to.equal('text');
        expect(types.get('Статус')).to.equal('text');
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});

