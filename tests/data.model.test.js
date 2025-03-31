// tests/data.model.test.js

const Data = require('../models');
const db = require('../config/db');
const { expect } = require('chai');
const { createTestData, createMultiBlockTestData } = require('./testDataCreation');

describe('Data Model Test', () => {
  before(async function() {
    if (!process.env.MONGODB_URI) {
      console.log('Skipping DB tests - no MongoDB URI provided');
      this.skip();
    }
    try {
      await db.connect();
    } catch (error) {
      console.log('Failed to connect to MongoDB:', error.message);
      this.skip();
    }
  });

  after(async function() {
    try {
      await Data.deleteMany({});
      await db.disconnect();
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  });

  beforeEach(async () => {
    await Data.deleteMany({});
  });

  it('should validate valid data', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['test', '2023'],
      blocks: [{
        type: 'table',
        source: 'excel',
        content: {
          headers: [{ value: 'Test', level: 1 }],
          rows: [{
            rowNumber: 1,
            cells: new Map([['Test', { value: 'Value', type: 'text' }]])
          }]
        },
        tags: ['test']
      }],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 1,
          columnCount: 1,
          processedAt: new Date(),
          fileSize: 1024
        }
      },
      status: 'completed'
    };

    const data = new Data(testData);
    const savedData = await data.save();
    
    expect(savedData._id).to.exist;
    expect(savedData.fileName).to.equal('test.xlsx');
    expect(savedData.documentType).to.equal('excel');
    expect(savedData.companyName).to.equal('Test Company');
    expect(savedData.globalTags).to.include('2023');
    expect(savedData.status).to.equal('completed');
  });

  it('should fail for invalid data', async () => {
    const invalidData = {
      // Отсутствует обязательное поле fileName
      documentType: 'excel',
      companyName: 'Test Company'
    };

    try {
      const data = new Data(invalidData);
      await data.save();
      expect.fail('Should throw validation error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('ValidationError');
      expect(error.message).to.include('fileName');
    }
  });

  it('should handle date formats correctly', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['2023', '01.2023', '02.2023'],
      blocks: [{
        type: 'table',
        source: 'excel',
        content: {
          headers: [{ value: 'Date', level: 1 }],
          rows: [{
            rowNumber: 1,
            cells: new Map([
              ['Date', { value: '01.2023', type: 'date' }]
            ])
          }]
        },
        tags: ['date']
      }],
      metadata: {
        format: 'monthly',
        statistics: {
          rowCount: 1,
          columnCount: 1,
          processedAt: new Date(),
          fileSize: 1024
        }
      },
      status: 'completed'
    };

    const data = new Data(testData);
    const savedData = await data.save();
    expect(savedData.metadata.format).to.equal('monthly');
    expect(savedData.globalTags).to.include('01.2023');
  });

  it('should handle multiple data blocks', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['test1', 'test2'],
      blocks: [
        {
          type: 'table',
          source: 'excel',
          content: {
            headers: [{ value: 'Test1', level: 1 }],
            rows: [{
              rowNumber: 1,
              cells: new Map([['Test1', { value: 'Value1', type: 'text' }]])
            }]
          },
          tags: ['test1']
        },
        {
          type: 'table',
          source: 'excel',
          content: {
            headers: [{ value: 'Test2', level: 1 }],
            rows: [{
              rowNumber: 1,
              cells: new Map([['Test2', { value: 'Value2', type: 'text' }]])
            }]
          },
          tags: ['test2']
        }
      ],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 2,
          columnCount: 1,
          processedAt: new Date(),
          fileSize: 1024
        }
      },
      status: 'completed'
    };

    const data = new Data(testData);
    const savedData = await data.save();
    expect(savedData.blocks).to.have.length(2);
    expect(savedData.blocks[0].tags).to.include('test1');
    expect(savedData.blocks[1].tags).to.include('test2');
  });

  it('should validate metadata structure', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['test'],
      blocks: [{
        type: 'table',
        source: 'excel',
        content: {
          headers: [{ value: 'Test', level: 1 }],
          rows: []
        },
        tags: ['test']
      }],
      metadata: {
        format: 'invalid_format', // Неверный формат
        statistics: {
          rowCount: 1,
          columnCount: 1
        }
      }
    };

    try {
      const data = new Data(testData);
      await data.save();
      expect.fail('Should throw validation error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('ValidationError');
      expect(error.message).to.include('format');
    }
  });

  it('should handle empty values correctly', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['test'],
      blocks: [{
        type: 'table',
        source: 'excel',
        content: {
          headers: [{ value: 'Test', level: 1 }],
          rows: [{
            rowNumber: 1,
            cells: new Map([['Test', { value: '', type: 'empty' }]])
          }]
        },
        tags: ['test']
      }],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 1,
          columnCount: 1,
          processedAt: new Date()
        }
      }
    };

    const data = new Data(testData);
    const savedData = await data.save();
    const firstCell = savedData.blocks[0].content.rows[0].cells.get('Test');
    expect(firstCell.value).to.equal('');
    expect(firstCell.type).to.equal('empty');
  });

  it('should update existing document', async () => {
    // Создаем исходный документ
    const initialData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      globalTags: ['test'],
      blocks: [{
        type: 'table',
        source: 'excel',
        content: {
          headers: [{ value: 'Test', level: 1 }],
          rows: [{
            rowNumber: 1,
            cells: new Map([['Test', { value: 'Initial', type: 'text' }]])
          }]
        },
        tags: ['test']
      }],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 1,
          columnCount: 1,
          processedAt: new Date()
        }
      }
    };

    const data = new Data(initialData);
    const savedData = await data.save();

    // Обновляем документ
    savedData.companyName = 'Updated Company';
    savedData.blocks[0].content.rows[0].cells.set('Test', { 
      value: 'Updated', 
      type: 'text' 
    });
    
    const updatedData = await savedData.save();

    expect(updatedData.companyName).to.equal('Updated Company');
    expect(updatedData.blocks[0].content.rows[0].cells.get('Test').value)
      .to.equal('Updated');
  });
});


