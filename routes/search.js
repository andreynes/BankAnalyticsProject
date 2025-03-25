'use strict';
const express = require('express');
const router = express.Router();
const Data = require('../models/Data'); // Модель данных. Убедитесь, что файл модели находится в models/Data.js

// GET /search?query=ваш_запрос
router.get('/', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ error: 'Параметр query обязателен' });
    }
    // Выполнение поиска по полю tags (без учёта регистра)
    const results = await Data.find({ tags: { $regex: query, $options: 'i' } });
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'Данные не найдены' });
    }
    res.json(results);
  } catch (error) {
    console.error('Ошибка при выполнении поиска:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


