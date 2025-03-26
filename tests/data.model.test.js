
"use strict";

const { expect } = require('chai');
const mongoose = require('mongoose');
const Data = require('../models/Data');
const { connectDB, disconnectDB } = require('../config/db');

describe('Data Model Test', () => {
  before(async () => {
    await connectDB();
  });

  it('should validate valid data', async () => {
    const validData = new Data({
      fileName: 'test.xlsx',
      uploadDate: new Date(),
      companyName: 'Тестовая компания',
      dates: ['2020', '2021', '2022'],
      indicators: ['Выручка', 'EBITDA', 'Прибыль'],
      data: [
        {
          rowNumber: 1,
          label: 'Выручка',
          indicator: 'Выручка',
          values: new Map([
            ['2020', 1000.50],
            ['2021', 2000.75],
            ['2022', 3000.25]
          ]),
          tags: ['выручка', 'revenue', '2020', '2021', '2022']
        },
        {
          rowNumber: 2,
          label: 'EBITDA',
          indicator: 'EBITDA',
          values: new Map([
            ['2020', 500.25],
            ['2021', 750.50],
            ['2022', 1000.75]
          ]),
          tags: ['ebitda', '2020', '2021', '2022']
        }
      ],
      metadata: {
        statistics: {
          rowCount: 2,
          columnCount: 3,
          processedAt: new Date(),
          fileSize: 1024
        },
        tagging: {
          tags: ['выручка', 'ebitda', '2020', '2021', '2022'],
          tagCount: 5
        },
        format: 'yearly'
      },
      tags: ['выручка', 'ebitda', '2020', '2021', '2022'],
      status: 'completed'
    });

    const savedData = await validData.save();
    expect(savedData._id).to.exist;
    expect(savedData.companyName).to.equal('Тестовая компания');
    expect(savedData.dates).to.have.length(3);
    expect(savedData.indicators).to.have.length(3);
    expect(savedData.data).to.have.length(2);
    expect(savedData.status).to.equal('completed');
  });

  it('should fail for invalid data', async () => {
    const invalidData = new Data({
      // Пропускаем обязательные поля
      fileName: 'test.xlsx'
    });

    try {
      await invalidData.save();
      throw new Error('Should not reach this point');
    } catch (error) {
      expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
      expect(error.errors.companyName).to.exist;
    }
  });

  it('should handle date formats correctly', async () => {
    const dataWithDates = new Data({
      fileName: 'test-dates.xlsx',
      uploadDate: new Date(),
      companyName: 'Тестовая компания',
      dates: ['01.01.2020', '01.01.2021', '01.01.2022'],
      indicators: ['Выручка'],
      data: [{
        rowNumber: 1,
        label: 'Выручка',
        indicator: 'Выручка',
        values: new Map([
          ['01.01.2020', 1000],
          ['01.01.2021', 2000],
          ['01.01.2022', 3000]
        ]),
        tags: ['выручка', '2020', '2021', '2022']
      }],
      metadata: {
        statistics: {
          rowCount: 1,
          columnCount: 3,
          processedAt: new Date()
        },
        tagging: {
          tags: ['выручка', '2020', '2021', '2022'],
          tagCount: 4
        },
        format: 'monthly'
      },
      tags: ['выручка', '2020', '2021', '2022']
    });

    const savedData = await dataWithDates.save();
    expect(savedData.metadata.format).to.equal('monthly');
    expect(savedData.years).to.include('2020');
  });

  after(async () => {
    await Data.deleteMany({});
    await disconnectDB();
  });
});

