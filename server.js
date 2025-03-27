const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./config/db');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');


const app = express();


// Middleware для логирования запросов (улучшенная версия)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
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


// Прямой маршрут для поиска
app.get('/api/search', async (req, res) => {
    console.log('Direct search route hit:', req.query);
    try {
        const searchRouter = require('./routes/search');
        searchRouter.handle(req, res);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});


// Роуты API
app.use('/api/search', searchRouter);
app.use('/api/upload', uploadRouter);


// Статические файлы
app.use(express.static(path.join(__dirname, 'add-in/src')));


// Маршрут для taskpane.html
app.get('/taskpane.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-in/src/taskpane.html'));
});


// Корневой маршрут
app.get('/', (req, res) => {
    res.send('BankAnalytics API Server is running');
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
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        url: req.url,
        path: req.path
    });
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
            console.log(`Server URL: http://localhost:${PORT}`);
            console.log('Available routes:');
            console.log('- GET /api/search');
            console.log('- POST /api/upload');
            console.log('- GET /taskpane.html');
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



