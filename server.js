'use strict';

const path = require('path');
// Загружаем переменные окружения из файла .env, который находится в папке backend
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log("MONGO_URI:", process.env.MONGO_URI);

const express = require('express');
const app = express();

// Подключаем модуль подключения к базе данных
const connectDB = require('./config/db');

// Middlewares для парсинга JSON и urlencoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем маршруты
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

app.use('/upload', uploadRouter);
app.use('/search', searchRouter);

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

// Подключение к MongoDB
connectDB();

// Запуск сервера (не в режиме тестирования)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
}

module.exports = app;



