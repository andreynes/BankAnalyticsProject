"use strict";

const { expect } = require('chai');
const mongoose = require('mongoose');
const Data = require('../models/Data');
const { connectDB, disconnectDB } = require('../config/db');

describe('Data Model Test', function() {
  before(async function() {
    this.timeout(30000);
    await connectDB();
  });

  it('should validate valid data', async function() {
    const validData = new Data({
      fileName: 'test.xlsx',
      uploadDate: new Date(),
      companyName: 'Тестовая компания',
      dates: ['2020', '2021', '2022'],
      indicators: ['Выручка', 'EBITDA'],
      data: [{
        rowNumber: 1,
        label: 'Выручка',
        indicator: 'Выручка',
        values: {
          '2020': 1000.50,
          '2021': 2000.75,
          '2022': 3000.25
        },
        tags: ['выручка', '2020', '2021', '2022']
      }],
      metadata: {
        format: 'yearly',
        statistics: {
          rowCount: 1,
          columnCount: 3,
          processedAt: new Date()
        },
        tagging: {
          tags: ['выручка', '2020', '2021', '2022'],
          tagCount: 4
        }
      },
      tags: ['выручка', '2020', '2021', '2022'],
      status: 'completed'
    });

    const savedData = await validData.save();
    expect(savedData.status).to.equal('completed');
  });

  it('should fail for invalid data', async function() {
    const invalidData = new Data({
      fileName: 'test.xlsx'
    });

    try {
      await invalidData.save();
      throw new Error('Should not reach this point');
    } catch (error) {
      expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
    }
  });

  it('should handle date formats correctly', async function() {
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
        values: {
          '01.01.2020': 1000,
          '01.01.2021': 2000,
          '01.01.2022': 3000
        },
        tags: ['выручка', '2020', '2021', '2022']
      }],
      metadata: {
        format: 'monthly',
        statistics: {
          rowCount: 1,
          columnCount: 3,
          processedAt: new Date()
        },
        tagging: {
          tags: ['выручка', '2020', '2021', '2022'],
          tagCount: 4
        }
      },
      tags: ['выручка', '2020', '2021', '2022'],
      status: 'completed'
    });

    const savedData = await dataWithDates.save();
    expect(savedData.metadata.format).to.equal('monthly');
  });

  after(async function() {
    this.timeout(10000);
    await Data.deleteMany({});
    await disconnectDB();
  });
});


