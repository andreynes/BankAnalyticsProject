const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models/Data');
const { connectDB } = require('../config/db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const result = await ExcelProcessor.processFile(req.file.path);
      
      const dataModel = new Data({
        fileName: req.file.originalname,
        uploadDate: new Date(),
        companyName: result.companyName,
        dates: result.dates,
        indicators: result.indicators,
        data: result.data.map(item => ({
          rowNumber: item.rowNumber,
          label: item.indicator,
          indicator: item.indicator,
          values: Object.fromEntries(item.values),
          tags: item.tags
        })),
        metadata: {
          ...result.metadata,
          format: result.metadata.format // Явно указываем формат
        },
        tags: result.metadata.tagging.tags,
        status: 'completed'
      });
  
      const savedData = await dataModel.save();
  
      res.status(200).json({
        message: 'File processed successfully',
        data: savedData
      });
    } catch (error) {
      console.error('Error processing Excel file:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;


