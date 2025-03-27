// tests/data.model.test.js


const Data = require('../models/Data');
const db = require('../config/db');
const { expect } = require('chai');


describe('Data Model Test', () => {
    before(async function() {
      if (!process.env.MONGODB_URI) {
        console.log('Skipping database tests - no MongoDB URI provided');
        this.skip();
      }
      try {
        await db.connect();
      } catch (error) {
        console.log('Failed to connect to MongoDB:', error.message);
        this.skip();
      }
    });
  


  after(async function ()  {
    try {
        await Data.deleteMany({});
        await db.disconnect();
    }   catch (error) {
        console.warn('Warning: Error during cleanup:', error.message);
    }
  });


  beforeEach(async () => {
    await Data.deleteMany({});
  });


  it('should validate valid data', async () => {
    const validData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      dates: ['2023', '2024'],
      indicators: ['Revenue', 'Profit'],
      data: [{
        rowNumber: 1,
        indicator: 'Revenue',
        values: {
          '2023': 1000000,
          '2024': 1200000
        },
        tags: ['revenue', '2023', '2024']
      }],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 1,
          columnCount: 2,
          processedAt: new Date(),
          fileSize: 1024
        },
        tagging: {
          tags: ['revenue', '2023', '2024'],
          tagCount: 3
        }
      },
      tags: ['revenue', '2023', '2024'],
      status: 'completed'
    };


    const data = new Data(validData);
    const savedData = await data.save();
    
    expect(savedData._id).to.exist;
    expect(savedData.fileName).to.equal('test.xlsx');
    expect(savedData.companyName).to.equal('Test Company');
    expect(savedData.documentType).to.equal('excel');
    expect(savedData.status).to.equal('completed');
  });


  it('should fail for invalid data', async () => {
    const invalidData = {
      // Отсутствует обязательное поле fileName
      companyName: 'Test Company',
      documentType: 'excel',
      dates: ['2023'],
      indicators: ['Revenue']
    };


    try {
      const data = new Data(invalidData);
      await data.save();
      expect.fail('Should throw validation error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.name).to.equal('ValidationError');
    }
  });


  it('should handle date formats correctly', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      dates: ['01.2023', '02.2023', '2024'],
      indicators: ['Revenue'],
      data: [{
        rowNumber: 1,
        indicator: 'Revenue',
        values: {
          '01.2023': 1000000,
          '02.2023': 1100000,
          '2024': 1200000
        }
      }],
      metadata: {
        format: 'monthly',
        statistics: {
          rowCount: 1,
          columnCount: 3,
          processedAt: new Date()
        }
      }
    };


    const data = new Data(testData);
    const savedData = await data.save();


    expect(savedData.metadata.format).to.equal('monthly');
    expect(savedData.dates).to.include('01.2023');
    expect(savedData.dates).to.include('2024');
  });


  it('should handle multiple data blocks', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      dates: ['2023', '2024'],
      indicators: ['Revenue', 'Profit'],
      data: [
        {
          rowNumber: 1,
          indicator: 'Revenue',
          values: {
            '2023': 1000000,
            '2024': 1200000
          }
        },
        {
          rowNumber: 2,
          indicator: 'Profit',
          values: {
            '2023': 300000,
            '2024': 350000
          }
        }
      ],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 2,
          columnCount: 2,
          processedAt: new Date()
        }
      }
    };


    const data = new Data(testData);
    const savedData = await data.save();


    expect(savedData.data).to.have.lengthOf(2);
    expect(savedData.indicators).to.include('Revenue');
    expect(savedData.indicators).to.include('Profit');
  });


  it('should validate metadata structure', async () => {
    const testData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      dates: ['2023'],
      indicators: ['Revenue'],
      data: [{
        rowNumber: 1,
        indicator: 'Revenue',
        values: { '2023': 1000000 }
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
      dates: ['2023'],
      indicators: ['Revenue'],
      data: [{
        rowNumber: 1,
        indicator: 'Revenue',
        values: { '2023': '' } // Пустое значение
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


    expect(savedData.data[0].values['2023']).to.equal('');
  });


  it('should update existing document', async () => {
    // Создаем исходный документ
    const initialData = {
      fileName: 'test.xlsx',
      documentType: 'excel',
      companyName: 'Test Company',
      dates: ['2023'],
      indicators: ['Revenue'],
      data: [{
        rowNumber: 1,
        indicator: 'Revenue',
        values: { '2023': 1000000 }
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
    savedData.data[0].values['2023'] = 1100000;
    const updatedData = await savedData.save();


    expect(updatedData.companyName).to.equal('Updated Company');
    expect(updatedData.data[0].values['2023']).to.equal(1100000);
  });
});



