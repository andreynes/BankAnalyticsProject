// tests/database.test.js

const { expect } = require('chai');
const { connect, disconnect } = require('../config/db');
const { mongoose } = require('./setup');
const Data = require('../models');

describe('Database Connection', () => {
  beforeEach(async function() {
    if (!process.env.MONGODB_URI) {
      console.log('Skipping database tests - no MongoDB URI provided');
      this.skip();
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('should connect to MongoDB', async () => {
    const conn = await connect();
    expect(conn.connection.readyState).to.equal(1);
    expect(conn.connection.name).to.equal('testdb');
  });

  it('should use test database', async () => {
    const conn = await connect();
    expect(conn.connection.name).to.equal('testdb');
  });

  it('should handle multiple connections', async () => {
    const conn1 = await connect();
    const conn2 = await connect();
    expect(conn1.connection.readyState).to.equal(1);
    expect(conn2.connection.readyState).to.equal(1);
  });

  it('should handle disconnection', async () => {
    await connect();
    await disconnect();
    expect(mongoose.connection.readyState).to.equal(0);
  });

  it('should handle database operations', async () => {
    await connect();
    
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
    expect(savedData.globalTags).to.include('test');

    await Data.deleteMany({});
  });
});


