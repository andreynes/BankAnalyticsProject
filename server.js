const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./config/db');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

const app = express();

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Основные middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'add-in/src')));

// Роуты API
app.use('/api/upload', uploadRouter);
app.use('/api/search', searchRouter);

// Корневой маршрут
app.get('/', (req, res) => {
    res.send('BankAnalytics API Server is running');
});

// Маршрут для taskpane.html
app.get('/taskpane.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-in/src/taskpane.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(`${new Date().toISOString()} Error:`, err);
    res.status(500).json({ 
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Функция запуска сервера
const startServer = async () => {
    try {
        // Подключаемся к MongoDB
        await connectDB();
        
        // Запускаем сервер
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('MongoDB connected successfully');
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Запускаем сервер только если не в тестовом режиме
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;


