'use strict';

const path = require('path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log("MONGO_URI:", process.env.MONGO_URI);

const app = express();

// Подключаем middleware для отдачи статических файлов из папки add-in/src
app.use(express.static(path.join(__dirname, 'add-in', 'src')));

// Middleware для парсинга JSON и urlencoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем модуль подключения к базе данных
const connectDB = require('./config/db');
// Вызываем подключение к БД
connectDB();

// Подключаем маршруты
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

app.use('/upload', uploadRouter);
app.use('/search', searchRouter);

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
    });
}

module.exports = app;



