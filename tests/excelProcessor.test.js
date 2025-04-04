// tests/excelProcessor.test.js


const ExcelProcessor = require('../utils/excelProcessor');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');


describe('ExcelProcessor', () => {
  let processor;
  let testFilePath;


  before(() => {
    processor = new ExcelProcessor();
    // Создаем тестовый Excel файл
    testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');
    createTestExcelFile(testFilePath);
  });


  after(() => {
    // Удаляем тестовый файл
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });


  describe('process', () => {
    it('should process simple Excel file', async () => {
      const result = await processor.process(testFilePath);
      expect(result).to.have.property('fileName');
      expect(result).to.have.property('documentType', 'excel');
      expect(result).to.have.property('blocks').that.is.an('array');
      expect(result.blocks).to.have.lengthOf.at.least(1);
    });


    it('should handle missing file', async () => {
      try {
        await processor.process('nonexistent.xlsx');
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('File not found');
      }
    });
  });


  describe('processWorksheet', () => {
    it('should process worksheet with headers', async () => {
      const workbook = xlsx.readFile(testFilePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const result = await ExcelProcessor.processWorksheet(worksheet, 'Sheet1');
      
      expect(result.content.headers).to.have.length.above(0);
      expect(result.content.rows).to.have.length.above(0);
    });
  
    it('should handle empty worksheet', async () => {
      const emptyWorksheet = { '!ref': 'A1:A1' };
      const result = await ExcelProcessor.processWorksheet(emptyWorksheet, 'Empty');
      
      expect(result.content.rows).to.have.length(0);
    });
  });
  


  describe('Multi-level headers', () => {
    it('should process multi-level headers', async () => {
      const testFilePath2 = path.join(__dirname, 'test-files', 'multi-level.xlsx');
      createMultiLevelTestFile(testFilePath2);


      const result = await processor.process(testFilePath2);
      const firstBlock = result.blocks[0];
      
      expect(firstBlock.content.headers).to.be.an('array');
      expect(firstBlock.content.headers[0]).to.have.property('level');
      
      fs.unlinkSync(testFilePath2);
    });
  });


  describe('Data types detection', () => {
    it('should correctly identify different data types', async () => {
      const processor = new ExcelProcessor();
      const result = await processor.process(testFilePath);
      const types = new Set();
      
      result.blocks[0].content.rows.forEach(row => {
        row.cells.forEach(cell => {
          if (cell.type) types.add(cell.type);
        });
      });
  
      expect(types.size).to.be.at.least(2);
    });
  });
  


  describe('Tags generation', () => {
    it('should generate relevant tags', async () => {
      const result = await processor.process(testFilePath);
      
      expect(result.globalTags).to.be.an('array');
      expect(result.globalTags.length).to.be.at.least(1);
      
      result.blocks.forEach(block => {
        expect(block.tags).to.be.an('array');
      });
    });
  });

  describe('Block Processing', () => {
    it('should correctly split content into blocks', async () => {
        const processor = new ExcelProcessor();
        const testData = [
            ['Text content 1'],
            ['More text'],
            [''],
            ['Header1', 'Header2', 'Header3'],
            ['1', '2', '3'],
            ['4', '5', '6'],
            [''],
            ['Final text content']
        ];

        const blocks = processor.analyzeAndCreateBlocks(testData);
        
        expect(blocks).toHaveLength(3);
        expect(blocks[0].type).toBe('text');
        expect(blocks[1].type).toBe('table');
        expect(blocks[2].type).toBe('text');
    });

    it('should properly process table blocks', async () => {
        const processor = new ExcelProcessor();
        const testData = [
            ['Header1', 'Header2', 'Header3'],
            ['1', '2', '3'],
            ['4', '5', '6']
        ];

        const blocks = processor.analyzeAndCreateBlocks(testData);
        
        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe('table');
        expect(blocks[0].content.headers).toHaveLength(3);
        expect(blocks[0].content.rows).toHaveLength(2);
    });
  });
});


// Вспомогательная функция для создания тестового Excel файла
function createTestExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  const data = [
    ['Company', '2022', '2023'],
    ['Revenue', 1000000, 1200000],
    ['Profit', 300000, 350000],
    ['Employees', 100, 120]
  ];
  
  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  xlsx.writeFile(workbook, filePath);
}


// Вспомогательная функция для создания Excel файла с многоуровневыми заголовками
function createMultiLevelTestFile(filePath) {
  const workbook = xlsx.utils.book_new();
  const data = [
    ['Financial Metrics', '', '', 'Operational Metrics', ''],
    ['Revenue', 'Profit', 'Margin', 'Employees', 'Offices'],
    [1000000, 300000, '30%', 100, 5],
    [1200000, 350000, '29%', 120, 6]
  ];
  
  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  xlsx.writeFile(workbook, filePath);
}



