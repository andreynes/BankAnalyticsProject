// tests/edge-cases.test.js

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const ExcelProcessor = require('../utils/excelProcessor');
const xlsx = require('xlsx');

describe('Edge Cases Testing', () => {
    let testFilePath;
    let processor;

    before(() => {
        testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');
        if (!fs.existsSync(path.dirname(testFilePath))) {
            fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
        }
        
        processor = new ExcelProcessor();

        // Создаем тестовый файл
        const workbook = xlsx.utils.book_new();
        
        // Данные для тестирования граничных случаев
        const data = [
            ['Header', '', 'Very long header '.repeat(20)],
            ['', 'Empty cell', '@#$%^&*'],
            ['Normal', '123.45', '2023-01-15'],
            ['Percentage', '15%', '-25.5%'],
            ['Currency', '$1,234.56', '€2,000'],
            ['Special', '=1+1', '<script>alert("test")</script>'],
            ['Merged', 'Merged Cell', 'Merged Cell'],
            ['Unicode', 'Тест', '测试'],
            ['Numbers', '1e6', '-1.23e-4'],
            ['Dates', '44927', '2023-12-31']
        ];

        const worksheet = xlsx.utils.aoa_to_sheet(data);
        
        // Добавляем объединенные ячейки
        worksheet['!merges'] = [
            { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } }
        ];

        xlsx.utils.book_append_sheet(workbook, worksheet, 'Edge Cases');
        xlsx.writeFile(workbook, testFilePath);
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    it('should handle empty rows', async () => {
        const result = await processor.process(testFilePath);
        const emptyRow = result.blocks[0].content.rows.find(row => 
            Array.from(row.cells.values()).every(cell => cell.type === 'empty')
        );
        expect(emptyRow).to.exist;
    });

    it('should trim headers and values', async () => {
        const result = await processor.process(testFilePath);
        const block = result.blocks[0];
        
        block.content.headers.forEach(header => {
            if (header.value) {
                expect(header.value).to.equal(header.value.trim());
            }
        });

        block.content.rows.forEach(row => {
            row.cells.forEach(cell => {
                if (cell.value && typeof cell.value === 'string') {
                    expect(cell.value).to.equal(cell.value.trim());
                }
            });
        });
    });

    it('should handle very long values', async () => {
        const result = await processor.process(testFilePath);
        const longCell = Array.from(result.blocks[0].content.rows[0].cells.values())
            .find(cell => cell.value && String(cell.value).length > 100);
        
        expect(longCell).to.exist;
        expect(longCell.type).to.equal('text');
        expect(longCell.value.length).to.be.at.most(1000);
    });

    it('should handle special characters', async () => {
        const result = await processor.process(testFilePath);
        const specialRow = result.blocks[0].content.rows.find(row => 
            Array.from(row.cells.values())
                .some(cell => cell.value && /[!@#$%^&*(),.?":{}|<>]/.test(String(cell.value)))
        );
        expect(specialRow).to.exist;
    });

    it('should validate data types', async () => {
        const result = await processor.process(testFilePath);
        const types = new Set();

        result.blocks[0].content.rows.forEach(row => {
            row.cells.forEach(cell => {
                if (cell.type) {
                    types.add(cell.type);
                }
            });
        });

        expect(types.has('number')).to.be.true;
        expect(types.has('text')).to.be.true;
        expect(types.has('date')).to.be.true;
        expect(types.has('percentage')).to.be.true;
        expect(types.has('currency')).to.be.true;
    });

    it('should handle merged cells', async () => {
        const result = await processor.process(testFilePath);
        const mergedRow = result.blocks[0].content.rows.find(row =>
            Array.from(row.cells.values())
                .some(cell => cell.value === 'Merged Cell')
        );
        
        expect(mergedRow).to.exist;
        expect(result.blocks[0].content.mergedCells).to.be.an('array');
        expect(result.blocks[0].content.mergedCells.length).to.be.above(0);
    });

    it('should handle unicode characters', async () => {
        const result = await processor.process(testFilePath);
        const unicodeRow = result.blocks[0].content.rows.find(row =>
            Array.from(row.cells.values())
                .some(cell => /[\u0400-\u04FF]|[\u4E00-\u9FFF]/.test(String(cell.value)))
        );
        
        expect(unicodeRow).to.exist;
        expect(Array.from(unicodeRow.cells.values())
            .some(cell => cell.value === 'Тест')).to.be.true;
        expect(Array.from(unicodeRow.cells.values())
            .some(cell => cell.value === '测试')).to.be.true;
    });

    it('should handle scientific notation', async () => {
        const result = await processor.process(testFilePath);
        const scientificRow = result.blocks[0].content.rows.find(row =>
            Array.from(row.cells.values())
                .some(cell => /^-?\d+\.?\d*e[+-]?\d+$/i.test(String(cell.value)))
        );
        
        expect(scientificRow).to.exist;
        const cells = Array.from(scientificRow.cells.values());
        expect(cells.find(cell => String(cell.value) === '1e6')).to.exist;
        expect(cells.find(cell => String(cell.value) === '-1.23e-4')).to.exist;
    });

    it('should sanitize potentially dangerous content', async () => {
        const result = await processor.process(testFilePath);
        const sanitizedRow = result.blocks[0].content.rows.find(row => 
            Array.from(row.cells.values())
                .some(cell => String(cell.value).includes('script'))
        );
        expect(sanitizedRow).to.exist;
        expect(Array.from(sanitizedRow.cells.values())
            .some(cell => String(cell.value).includes('<script>'))).to.be.false;
    });

    it('should handle Excel date numbers', async () => {
        const result = await processor.process(testFilePath);
        const dateRow = result.blocks[0].content.rows.find(row =>
            Array.from(row.cells.values())
                .some(cell => cell.type === 'date')
        );
        
        expect(dateRow).to.exist;
        const dateCells = Array.from(dateRow.cells.values())
            .filter(cell => cell.type === 'date');
        expect(dateCells).to.have.length.above(0);
    });

    it('should handle formulas safely', async () => {
        const result = await processor.process(testFilePath);
        const formulaRow = result.blocks[0].content.rows.find(row => 
            Array.from(row.cells.values())
                .some(cell => String(cell.value) === '1+1')
        );
        expect(formulaRow).to.exist;
    });

    it('should preserve numeric precision', async () => {
        const result = await processor.process(testFilePath);
        const numericCells = result.blocks[0].content.rows
            .flatMap(row => Array.from(row.cells.values()))
            .filter(cell => cell.type === 'number');
        
        numericCells.forEach(cell => {
            if (typeof cell.value === 'number') {
                expect(cell.value.toString()).to.not.include('e');
                expect(cell.value.toString().split('.')[1] || '')
                    .to.have.length.at.most(10);
            }
        });
    });
});


