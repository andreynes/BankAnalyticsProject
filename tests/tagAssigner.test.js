const { expect } = require('chai');
const TagAssigner = require('../utils/tagAssigner');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

describe('TagAssigner', () => {
    let tagAssigner;
    const testData = {
        headers: ['Дата', 'Клиент', 'Сумма', 'Количество', 'Статус'],
        data: [
            {
                rowNumber: 1,
                row: new Map([
                    ['Дата', '2024-03-21'],
                    ['Клиент', 'ООО "Тест"'],
                    ['Сумма', '1500000.50'],
                    ['Количество', '5'],
                    ['Статус', 'срочно в работе']
                ])
            },
            {
                rowNumber: 2,
                row: new Map([
                    ['Дата', '2024-03-22'],
                    ['Клиент', 'ИП Иванов'],
                    ['Сумма', '-2000.75'],
                    ['Количество', ''],
                    ['Статус', 'отложено']
                ])
            }
        ],
        metadata: {
            columnTypes: {
                'Дата': 'date',
                'Клиент': 'text',
                'Сумма': 'number',
                'Количество': 'number',
                'Статус': 'text'
            }
        }
    };

    beforeEach(() => {
        tagAssigner = new TagAssigner();
    });

    it('should assign basic tags', () => {
        const result = tagAssigner.assignTags(testData);
        expect(result.metadata.tagging.tags).to.be.an('array');
        expect(result.metadata.tagging.tags.length).to.be.greaterThan(0);
        
        const tags = result.metadata.tagging.tags.map(tag => tag.toLowerCase());
        expect(tags.some(tag => 
            tag.includes('количество') || 
            tag.includes('сумма') || 
            tag.includes('дата')
        )).to.be.true;
    });

    it('should identify business rules tags', () => {
        const result = tagAssigner.assignTags(testData);
        const tags = result.metadata.tagging.tags;
        
        // Проверяем бизнес-правила
        expect(tags).to.include('крупная_сумма'); // для 1500000.50
        expect(tags).to.include('отрицательное_значение'); // для -2000.75
        expect(tags).to.include('юридическое_лицо'); // для "ООО "Тест""
        expect(tags).to.include('пустые_данные'); // для пустого количества
    });

    it('should handle empty values', () => {
        const result = tagAssigner.assignTags(testData);
        const stats = result.metadata.tagging.statistics;
        
        expect(stats.emptyValues).to.equal(1);
        expect(result.metadata.tagging.tags).to.include('пустые_данные');
    });

    it('should identify categories', () => {
        const result = tagAssigner.assignTags(testData);
        const tags = result.metadata.tagging.tags;
        
        // Проверяем категории
        expect(tags).to.include('высокий_приоритет'); // для "срочно"
        expect(tags).to.include('низкий_приоритет'); // для "отложено"
    });

    it('should calculate correct statistics', () => {
        const result = tagAssigner.assignTags(testData);
        const stats = result.metadata.tagging.statistics;
        
        // Проверяем базовую статистику
        expect(stats.totalRows).to.equal(2);
        expect(stats.emptyValues).to.equal(1);
        
        // Проверяем типы колонок
        expect(stats.numericalColumns).to.include('Сумма');
        expect(stats.numericalColumns).to.include('Количество');
        expect(stats.categoricalColumns).to.include('Статус');
        expect(stats.categoricalColumns).to.include('Клиент');
        expect(stats.categoricalColumns).to.include('Дата');
    });

    it('should group tags by categories', () => {
        const result = tagAssigner.assignTags(testData);
        const groups = result.metadata.tagging.categories;
        
        // Проверяем структуру групп
        expect(groups).to.have.all.keys(['business', 'technical', 'content', 'other']);
        
        // Проверяем распределение тегов
        expect(groups.business).to.include('крупная_сумма');

        expect(groups.business).to.include('юридическое_лицо');
        expect(groups.technical).to.be.an('array');
        expect(groups.content).to.be.an('array');
    });

    it('should correctly parse amounts', () => {
        // Тестируем различные форматы чисел
        expect(tagAssigner.parseAmount('1234.56')).to.equal(1234.56);
        expect(tagAssigner.parseAmount('1,234.56')).to.equal(1234.56);
        expect(tagAssigner.parseAmount('1 234,56')).to.equal(1234.56);
        expect(tagAssigner.parseAmount('-2000.75')).to.equal(-2000.75);
        expect(tagAssigner.parseAmount('1000000')).to.equal(1000000);
        expect(tagAssigner.parseAmount('not a number')).to.equal(0);
        expect(tagAssigner.parseAmount('')).to.equal(0);
        expect(tagAssigner.parseAmount(null)).to.equal(0);
        expect(tagAssigner.parseAmount(undefined)).to.equal(0);
    });

    it('should handle real Excel data', () => {
        const testDir = path.join(__dirname, 'test-files');
        const testFilePath = path.join(testDir, 'tag-test.xlsx');

        // Создаем тестовый Excel файл
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата', 'Клиент', 'Сумма', 'Количество', 'Статус'],
            ['2024-03-21', 'ООО "Крупный клиент"', '2000000', '10', 'срочно'],
            ['2024-03-22', 'ИП Малый клиент', '5000', '', 'в очереди']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);

        // Преобразуем Excel данные
        const excelData = {
            headers: wsData[0],
            data: wsData.slice(1).map((row, idx) => ({
                rowNumber: idx + 2,
                row: new Map(row.map((cell, i) => [wsData[0][i], cell.toString()]))
            })),
            metadata: {
                columnTypes: {
                    'Дата': 'date',
                    'Клиент': 'text',
                    'Сумма': 'number',
                    'Количество': 'number',
                    'Статус': 'text'
                }
            }
        };

        const result = tagAssigner.assignTags(excelData);
        
        // Проверяем результаты
        expect(result.metadata.tagging.tags).to.include('крупная_сумма');
        expect(result.metadata.tagging.tags).to.include('высокий_приоритет');
        expect(result.metadata.tagging.tags).to.include('юридическое_лицо');
        expect(result.metadata.tagging.statistics.totalRows).to.equal(2);
        expect(result.metadata.tagging.statistics.emptyValues).to.equal(1);

        // Очистка
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});
