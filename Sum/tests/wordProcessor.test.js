// tests/wordProcessor.test.js

const WordProcessor = require('../utils/wordProcessor');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require('docx');

describe('WordProcessor', () => {
  let processor;
  let testFilePath;

  before(async () => {
    processor = new WordProcessor();
    
    // Создаем директорию для тестовых файлов если её нет
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Создаем тестовый файл
    testFilePath = path.join(testDir, 'test.docx');
    await createTestWordFile(testFilePath);
  });

  after(() => {
    // Удаляем тестовые файлы
    const testDir = path.join(__dirname, 'test-files');
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach(file => {
        if (file.endsWith('.docx')) {
          fs.unlinkSync(path.join(testDir, file));
        }
      });
    }
  });

  describe('Basic functionality', () => {
    it('should initialize with default options', () => {
      expect(processor.options).to.have.property('supportedFormats');
      expect(processor.options.supportedFormats).to.include('.docx');
      expect(processor.options.supportedFormats).to.include('.doc');
    });

    it('should accept custom options', () => {
      const customProcessor = new WordProcessor({ 
        preserveFormatting: true,
        tableExtraction: false 
      });
      expect(customProcessor.options).to.have.property('preserveFormatting', true);
      expect(customProcessor.options).to.have.property('tableExtraction', false);
    });
  });

  describe('Document processing', () => {
    it('should process Word document successfully', async () => {
      const result = await processor.process(testFilePath);
      
      expect(result).to.have.property('fileName');
      expect(result).to.have.property('documentType', 'word');
      expect(result).to.have.property('blocks').that.is.an('array');
      expect(result.blocks.length).to.be.at.least(1);
      expect(result).to.have.property('globalTags').that.is.an('array');
      expect(result.metadata).to.have.property('statistics');
    });

    it('should handle missing file', async () => {
      try {
        await processor.process('nonexistent.docx');
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('File not found');
      }
    });

    it('should handle empty document', async () => {
      const emptyDocPath = path.join(__dirname, 'test-files', 'empty.docx');
      await createEmptyWordFile(emptyDocPath);

      const result = await processor.process(emptyDocPath);
      expect(result.blocks).to.be.an('array');
      expect(result.blocks.length).to.equal(0);
    });
  });

  describe('Block detection', () => {
    it('should detect text blocks correctly', async () => {
      const result = await processor.process(testFilePath);
      const textBlocks = result.blocks.filter(block => block.type === 'text');
      
      expect(textBlocks).to.have.length.above(0);
      textBlocks.forEach(block => {
        expect(block.content).to.have.property('text').that.is.a('string');
        expect(block.content).to.have.property('paragraphs').that.is.an('array');
        expect(block.content).to.have.property('formatting');
        expect(block).to.have.property('tags').that.is.an('array');
      });
    });

    it('should detect table blocks correctly', async () => {
      const result = await processor.process(testFilePath);
      const tableBlocks = result.blocks.filter(block => block.type === 'table');
      
      expect(tableBlocks).to.have.length.above(0);
      tableBlocks.forEach(block => {
        expect(block.content).to.have.property('headers').that.is.an('array');
        expect(block.content).to.have.property('rows').that.is.an('array');
        expect(block).to.have.property('tags').that.is.an('array');
      });
    });

    it('should detect headings correctly', async () => {
      const result = await processor.process(testFilePath);
      const headingBlocks = result.blocks.filter(block => 
        block.type === 'text' && 
        block.content.isHeading
      );
      
      expect(headingBlocks).to.have.length.above(0);
      expect(headingBlocks[0].content.text).to.include('Financial Analysis');
    });
  });

  describe('Content analysis', () => {
    it('should identify document structure', async () => {
      const result = await processor.process(testFilePath);
      
      expect(result.metadata.statistics).to.have.property('totalBlocks');
      expect(result.metadata.statistics).to.have.property('textBlocks');
      expect(result.metadata.statistics).to.have.property('tableBlocks');
      expect(result.metadata.statistics.totalBlocks).to.equal(
        result.metadata.statistics.textBlocks + result.metadata.statistics.tableBlocks
      );
    });

    it('should extract metadata correctly', async () => {
      const result = await processor.process(testFilePath);
      
      expect(result.metadata).to.have.property('documentProperties');
      expect(result.metadata.documentProperties).to.have.property('created');
      expect(result.metadata.documentProperties).to.have.property('modified');
      expect(result.metadata.documentProperties).to.have.property('size');
    });

    it('should handle formatting', async () => {
      const result = await processor.process(testFilePath);
      const textBlock = result.blocks.find(block => block.type === 'text');
      
      expect(textBlock.content).to.have.property('formatting');
      expect(textBlock.content.formatting).to.have.all.keys(['bold', 'italic', 'size', 'alignment']);
    });
  });

  describe('Tag extraction', () => {
    it('should extract tags from text content', () => {
      const testText = 'Revenue in 2023 was higher than in 2022. Gazprom showed growth.';
      const tags = processor.extractTags(testText);
      
      expect(tags).to.include('2023');
      expect(tags).to.include('2022');
      expect(tags).to.include('revenue');
      expect(tags).to.include('gazprom');
      expect(tags).to.include('growth');
    });

    it('should extract tags from tables', async () => {
      const result = await processor.process(testFilePath);
      const tableBlock = result.blocks.find(block => block.type === 'table');
      
      expect(tableBlock).to.exist;
      expect(tableBlock.tags).to.be.an('array');
      expect(tableBlock.tags.length).to.be.above(0);
      expect(tableBlock.tags).to.include('revenue');
    });

    it('should handle numeric values in tag extraction', () => {
      const testText = 'Growth of 15.7% in Q3 2023';
      const tags = processor.extractTags(testText);
      
      expect(tags).to.include('2023');
      expect(tags).to.include('growth');
    });
  });

  describe('Table processing', () => {
    it('should process table headers correctly', () => {
      const testTable = {
        children: [
          {
            children: [
              { content: [{ text: 'Revenue' }] },
              { content: [{ text: 'Profit' }] }
            ]
          }
        ]
      };
      
      const headers = processor.extractTableHeaders(testTable);
      expect(headers).to.deep.equal(['Revenue', 'Profit']);
    });

    it('should process table rows correctly', () => {
      const testTable = {
        children: [
          {
            children: [
              { content: [{ text: 'Revenue' }] },
              { content: [{ text: 'Profit' }] }
            ]
          },
          {
            children: [
              { content: [{ text: '1000000' }] },
              { content: [{ text: '300000' }] }
            ]
          }
        ]
      };
      
      const headers = processor.extractTableHeaders(testTable);
      const rows = processor.extractTableRows(testTable, headers);
      
      expect(rows).to.have.length(1);
      expect(rows[0]).to.have.property('Revenue');
      expect(rows[0]).to.have.property('Profit');
    });

    it('should handle merged cells', async () => {
      const result = await processor.process(testFilePath);
      const tableBlock = result.blocks.find(block => block.type === 'table');
      
      expect(tableBlock.content).to.have.property('mergedCells');
      expect(tableBlock.content.mergedCells).to.be.an('array');
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted files', async () => {
      const corruptedPath = path.join(__dirname, 'test-files', 'corrupted.docx');
      fs.writeFileSync(corruptedPath, 'corrupted content');

      try {
        await processor.process(corruptedPath);
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('Invalid file format');
      } finally {
        if (fs.existsSync(corruptedPath)) {
          fs.unlinkSync(corruptedPath);
        }
      }
    });

    it('should handle unsupported file types', async () => {
      try {
        await processor.process('test.txt');
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('Unsupported file type');
      }
    });
  });
});

/**
 * Создание тестового Word файла
 * @param {string} filePath - Путь для сохранения файла
 */
async function createTestWordFile(filePath) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Financial Analysis Report 2023",
              bold: true,
              size: 32
            })
          ],
          heading: 'Heading1'
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "This report contains financial analysis for fiscal year 2023.",
              size: 24
            })
          ]
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph("Indicator")],
                  columnSpan: 1
                }),
                new TableCell({ 
                  children: [new Paragraph("2022")],
                  columnSpan: 1
                }),
                new TableCell({ 
                  children: [new Paragraph("2023")],
                  columnSpan: 1
                })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Revenue")] }),
                new TableCell({ children: [new Paragraph("1,000,000")] }),
                new TableCell({ children: [new Paragraph("1,200,000")] })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Profit")] }),
                new TableCell({ children: [new Paragraph("300,000")] }),
                new TableCell({ children: [new Paragraph("350,000")] })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Margin")] }),
                new TableCell({ children: [new Paragraph("30%")] }),
                new TableCell({ children: [new Paragraph("29.2%")] })
              ],
            })
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "1. Revenue Analysis",
              bold: true,
              size: 28
            })
          ],
          heading: 'Heading2'
        }),
        new Paragraph({
          children: [
            new TextRun("The company showed strong revenue growth in Q3 2023, reaching 1,200,000.")
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "2. Profit Analysis",
              bold: true,
              size: 28
            })
          ],
          heading: 'Heading2'
        }),
        new Paragraph({
          children: [
            new TextRun("Profit margins remained stable at 29% throughout 2023.")
          ]
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph("Quarter")],
                  columnSpan: 1
                }),
                new TableCell({ 
                  children: [new Paragraph("Revenue")],
                  columnSpan: 1
                }),
                new TableCell({ 
                  children: [new Paragraph("Growth")],
                  columnSpan: 1
                })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Q1 2023")] }),
                new TableCell({ children: [new Paragraph("280,000")] }),
                new TableCell({ children: [new Paragraph("5.2%")] })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Q2 2023")] }),
                new TableCell({ children: [new Paragraph("310,000")] }),
                new TableCell({ children: [new Paragraph("7.8%")] })
              ],
            })
          ],
        })
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Создание пустого Word файла
 * @param {string} filePath - Путь для сохранения файла
 */
async function createEmptyWordFile(filePath) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun("")]
        })
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}



