require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const uploadRoutes = require('./routes/upload');

const app = express();

// Middleware
app.use(express.json());
app.use('/upload', uploadRoutes);

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Успешное подключение к MongoDB');
    } catch (err) {
        console.error('Ошибка подключения к MongoDB:', err);
        process.exit(1);
    }
};

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

// Подключаемся к базе данных только если не выполняются тесты
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// Server
const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Сервер запущен на порту ${process.env.PORT || 3000}`);
});

module.exports = { app, connectDB };