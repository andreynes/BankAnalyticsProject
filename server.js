require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Middleware для работы с JSON
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Успешное подключение к MongoDB'))
.catch((err) => console.error('Ошибка подключения к MongoDB:', err));

// Простой тестовый маршрут
app.get('/', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

// Настройка порта
const PORT = process.env.PORT || 3000;

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

