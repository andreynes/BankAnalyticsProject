const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// Поиск по компании
router.get('/company/:name', async (req, res) => {
  try {
    const data = await Data.find({ companyName: new RegExp(req.params.name, 'i') });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Поиск по тегам
router.get('/tags', async (req, res) => {
  try {
    const tags = req.query.tags.split(',');
    const data = await Data.find({ tags: { $all: tags } });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Поиск по показателю
router.get('/indicator/:name', async (req, res) => {
  try {
    const data = await Data.find({ indicators: new RegExp(req.params.name, 'i') });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


