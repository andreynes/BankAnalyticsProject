const { expect } = require('chai');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelProcessor = require('../utils/excelProcessor');

describe('ExcelProcessor with AutoTagging', () => {
    const testDir = path.join(__dirname, 'test-files');
    const testFilePath = path.join(testDir, 'test-processor.xlsx');

    before(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата операции', 'Клиент', 'Сумма продажи', 'Количество', 'Статус'],
            ['2024-03-21', 'ООО "Тест"', '1500000.50', '5', 'срочно'],
            ['2024-03-22', 'ИП Иванов', '2000.75', '', 'отложено'],
            ['2024-03-23', 'ООО "Тест"', '750.25', '10', 'в работе']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should process file and generate appropriate tags', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        
        expect(result.metadata.tagging).to.exist;
        expect(result.metadata.tagging.tags).to.be.an('array');
        expect(result.metadata.tagging.tags.length).to.be.greaterThan(0);
    });

    it('should detect column types correctly', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        
        const types = result.metadata.columnTypes;
        expect(types.get('Дата операции')).to.equal('date');
        expect(types.get('Сумма продажи')).to.equal('number');
        expect(types.get('Количество')).to.equal('number');
        expect(types.get('Клиент')).to.equal('text');
        expect(types.get('Статус')).to.equal('text');
    });

    it('should count unique values', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        
        const stats = result.metadata.statistics;
        expect(stats.uniqueValuesCount['Клиент']).to.equal(2);
        expect(stats.uniqueValuesCount['Статус']).to.equal(3);
        expect(stats.emptyValues).to.equal(1);
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});

