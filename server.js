'use strict';
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware для обработки JSON и URL-кодированных данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к MongoDB через mongoose
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Подключение маршрутов
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

// Маршрут для загрузки файлов
app.use('/upload', uploadRouter);

// Маршрут для поиска по ключевым словам
app.use('/search', searchRouter);

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

