const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

router.get('/by-company/:company', async (req, res) => {
  try {
    const data = await Data.find({ companyName: req.params.company });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-tags', async (req, res) => {
  try {
    const tags = req.query.tags.split(',');
    const data = await Data.findByTags(tags);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-indicator/:indicator', async (req, res) => {
  try {
    const data = await Data.find({ 'data.indicator': req.params.indicator });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-year/:year', async (req, res) => {
  try {
    const data = await Data.find({ years: req.params.year });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


