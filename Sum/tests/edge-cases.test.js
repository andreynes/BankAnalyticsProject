// tests/edge-cases.test.js

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const ExcelProcessor = require('../utils/excelProcessor');
const xlsx = require('xlsx');

describe('Edge Cases Testing', () => {
  let testFilePath;

  before(() => {
    testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');
    if (!fs.existsSync(path.dirname(testFilePath))) {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }
    
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
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const emptyRow = block.content.rows.find(row => 
      Array.from(row.cells.values()).every(cell => cell.type === 'empty')
    );
    expect(emptyRow).to.exist;
  });

  it('should trim headers and values', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
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
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const longCell = Array.from(block.content.rows[0].cells.values())
      .find(cell => cell.value && cell.value.length > 100);
    
    expect(longCell).to.exist;
    expect(longCell.type).to.equal('text');
  });

  it('should handle special characters', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const specialChar = Array.from(block.content.rows[1].cells.values())
      .find(cell => cell.value && /[!@#$%^&*(),.?":{}|<>]/.test(cell.value));
    
    expect(specialChar).to.exist;
    expect(specialChar.value).to.include('@#$%^&*');
  });

  it('should validate data types', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const types = new Set();

    block.content.rows.forEach(row => {
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
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const mergedRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => cell.value === 'Merged Cell')
    );
    
    expect(mergedRow).to.exist;
    expect(block.content.mergedCells).to.be.an('array');
    expect(block.content.mergedCells.length).to.be.above(0);
  });

  it('should handle unicode characters', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const unicodeRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => /[\u0400-\u04FF]|[\u4E00-\u9FFF]/.test(cell.value))
    );
    
    expect(unicodeRow).to.exist;
    expect(Array.from(unicodeRow.cells.values())
      .some(cell => cell.value === 'Тест')).to.be.true;
    expect(Array.from(unicodeRow.cells.values())
      .some(cell => cell.value === '测试')).to.be.true;
  });

  it('should handle scientific notation', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const scientificRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => /^-?\d+\.?\d*e[+-]?\d+$/i.test(cell.value))
    );
    
    expect(scientificRow).to.exist;
    expect(Array.from(scientificRow.cells.values())
      .find(cell => cell.value === '1e6')).to.exist;
    expect(Array.from(scientificRow.cells.values())
      .find(cell => cell.value === '-1.23e-4')).to.exist;
  });

  it('should sanitize potentially dangerous content', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const sanitizedRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => cell.value && 
          (cell.value.includes('script') || cell.value.includes('=')))
    );
    
    expect(sanitizedRow).to.exist;
    const sanitizedCells = Array.from(sanitizedRow.cells.values());
    expect(sanitizedCells.some(cell => 
      cell.value && !cell.value.includes('<script>')
    )).to.be.true;
    expect(sanitizedCells.some(cell => 
      cell.value && !cell.value.startsWith('=')
    )).to.be.true;
  });

  it('should handle Excel date numbers', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const dateRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => cell.type === 'date')
    );
    
    expect(dateRow).to.exist;
    const dateCells = Array.from(dateRow.cells.values())
      .filter(cell => cell.type === 'date');
    expect(dateCells).to.have.length.above(0);
  });

  it('should handle formulas safely', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const formulaRow = block.content.rows.find(row => 
      Array.from(row.cells.values())
        .some(cell => cell.value && cell.value.startsWith('='))
    );
    
    expect(formulaRow).to.exist;
    const formulaCells = Array.from(formulaRow.cells.values())
      .filter(cell => cell.value && cell.value.startsWith('='));
    expect(formulaCells[0].value).to.not.include('=');
  });

  it('should preserve numeric precision', async () => {
    const result = await ExcelProcessor.processFile(testFilePath);
    const block = result.blocks[0];
    const numericCells = block.content.rows
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


