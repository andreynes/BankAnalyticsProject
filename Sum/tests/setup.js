// tests/setup.js

const mongoose = require('mongoose');
const { connect, disconnect } = require('../config/db');

// Очистка подключений перед всеми тестами
before(async function() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    // Очищаем все модели
    mongoose.models = {};
    mongoose.modelSchemas = {};
  } catch (error) {
    console.error('Error in before hook:', error);
    throw error;
  }
});

// Отключение после всех тестов
after(async function() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error in after hook:', error);
    throw error;
  }
});

// Очистка базы данных перед каждым тестом
beforeEach(async function() {
  if (mongoose.connection.readyState !== 0) {
    for (const collection in mongoose.connection.collections) {
      await mongoose.connection.collections[collection].deleteMany({});
    }
  }
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

module.exports = {
  mongoose,
  connect,
  disconnect
};


