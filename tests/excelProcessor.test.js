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

        // Создаем тестовый файл с разными типами данных
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата операции', 'Клиент', 'Сумма платежа', 'Количество товара', 'Статус оплаты'],
            ['2024-03-21', 'ООО "Тест"', '1000.50', '5', 'Оплачено'],
            ['2024-03-22', 'ООО "Тест"', '2000.75', '3', 'В обработке']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should process file and generate appropriate tags', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        
        // Проверяем наличие метаданных и тегов
        expect(result.metadata).to.exist;
        expect(result.metadata.suggestedTags).to.be.an('array');
        
        // Преобразуем все теги в нижний регистр для сравнения
        const lowerCaseTags = result.metadata.suggestedTags.map(tag => tag.toLowerCase());
        
        // Проверяем наличие хотя бы одного тега, связанного с суммой или количеством
        const hasFinancialTag = lowerCaseTags.some(tag => 
            tag.includes('финансы') || 
            tag.includes('сумма') || 
            tag.includes('количество')
        );
        
        expect(hasFinancialTag, 'Should have at least one financial-related tag').to.be.true;
    });

    it('should detect column types correctly', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result.metadata.columnTypes).to.exist;
        expect(result.metadata.columnTypes['Дата операции']).to.equal('date');
        expect(result.metadata.columnTypes['Сумма платежа']).to.equal('number');
    });

    it('should count unique values', async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        const uniqueCounts = result.metadata.fileAnalysis.uniqueValuesCount;
        expect(uniqueCounts['Клиент']).to.equal(1); // "ООО "Тест"" встречается дважды
        expect(uniqueCounts['Статус оплаты']).to.equal(2); // "Оплачено" и "В обработке"
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});