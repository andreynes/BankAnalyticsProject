"use strict";

const { expect } = require('chai');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

describe('Database Connection', () => {
  before(async () => {
    await connectDB();
  });

  it('should connect to MongoDB', () => {
    expect(mongoose.connection.readyState).to.equal(1);
  });

  it('should use test database', () => {
    expect(mongoose.connection.name).to.equal('bankanalytics');
  });

  it('should handle multiple connections', async () => {
    // Пробуем подключиться повторно
    await connectDB();
    expect(mongoose.connection.readyState).to.equal(1);
  });

  it('should handle disconnection', async () => {
    await disconnectDB();
    expect(mongoose.connection.readyState).to.equal(0);
    // Восстанавливаем подключение для следующих тестов
    await connectDB();
  });

  after(async () => {
    await disconnectDB();
  });
});

