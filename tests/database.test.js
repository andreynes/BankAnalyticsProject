// tests/database.test.js
require('dotenv').config();
const mongoose = require('mongoose');
const { expect } = require('chai');
const connectDB = require('../config/db');

describe('Database Connection', () => {
  before(async function() {
    this.timeout(10000); // увеличиваем таймаут, если требуется
    await connectDB();
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it('should connect to MongoDB', () => {
    expect(mongoose.connection.readyState).to.equal(1);
  });
});


