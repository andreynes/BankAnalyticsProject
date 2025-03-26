const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const uploadRouter = require('./routes/upload');
const searchRouter = require('./routes/search');

// Загрузка конфигурации из .env
dotenv.config();

// Создание экземпляра приложения
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к базе данных
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Роуты
app.use('/api/upload', uploadRouter);
app.use('/api/search', searchRouter);

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;


