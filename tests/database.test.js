// tests/database.test.js

const { expect } = require('chai');
const db = require('../config/db');
const mongoose = require('mongoose');

describe('Database Connection', () => {
  beforeEach(async function() {
    if (!process.env.MONGODB_URI) {
      console.log('Skipping database tests - no MongoDB URI provided');
      this.skip();
    }
  });

  afterEach(async () => {
    await mongoose.connection.close();
  });

  it('should connect to MongoDB', async () => {
    const conn = await db.connect();
    expect(conn.connection.readyState).to.equal(1);
  });

  it('should use test database', async () => {
    const conn = await db.connect();
    expect(conn.connection.name).to.equal('testdb');
  });

  it('should handle multiple connections', async () => {
    const conn1 = await db.connect();
    const conn2 = await db.connect();
    expect(conn1.connection.readyState).to.equal(1);
    expect(conn2.connection.readyState).to.equal(1);
  });

  it('should handle disconnection', async () => {
    await db.connect();
    await db.disconnect();
    expect(mongoose.connection.readyState).to.equal(0);
  });
});

