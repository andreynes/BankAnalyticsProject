const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

const app = express();

// Настройка CORS для PowerPoint надстройки
const corsOptions = {
    origin: ['https://localhost:3000', 'https://localhost:3001', 'https://localhost:*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware для логирования запросов
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.method === 'POST' ? req.body : undefined,
        headers: process.env.NODE_ENV === 'development' ? req.headers : undefined
    };
    console.log('Request:', JSON.stringify(logData, null, 2));
    next();
});

// Основные middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        mongoConnection: mongoose.connection.readyState === 1
    });
});

// Роуты API
app.use('/api/search', searchRouter);
app.use('/api/upload', uploadRouter);

// Статические файлы
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'add-in/src')));

// Маршрут для taskpane.html
app.get('/taskpane.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-in/src/taskpane.html'));
});

// Корневой маршрут
app.get('/', (req, res) => {
    res.json({
        status: 'BankAnalytics API Server is running',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date()
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} Error:`, err);

    // Форматирование ответа об ошибке
    const errorResponse = {
        status: 'error',
        message: err.message,
        timestamp,
        path: req.path,
        method: req.method
    };

    // Добавляем stack trace только в режиме разработки
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err.details;
    }

    res.status(err.status || 500).json(errorResponse);
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        status: 'error',
        error: 'Route not found',
        method: req.method,
        url: req.url,
        path: req.path,
        timestamp
    });
});

const PORT = process.env.PORT || 3000;

// Подключение к MongoDB с retry механизмом
const connectDB = async (retries = 5) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        if (retries > 0) {
            console.log(`MongoDB connection failed. Retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB(retries - 1);
        }
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Функция запуска сервера
const startServer = async () => {
    try {
        await connectDB();
        
        const server = app.listen(PORT, () => {
            console.log(`
==========================================
🚀 Server is running
📝 Environment: ${process.env.NODE_ENV}
🌐 URL: http://localhost:${PORT}
📊 MongoDB: Connected
==========================================
Available routes:
- GET  /api/search
- POST /api/upload
- GET  /taskpane.html
- GET  /health
==========================================
            `);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('Received shutdown signal');
            server.close(async () => {
                console.log('Server closed');
                await mongoose.connection.close();
                console.log('MongoDB connection closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

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


