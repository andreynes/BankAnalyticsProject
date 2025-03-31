// routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') {
    return cb(new Error('Only Excel files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Проверка размера файла
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds limit'
      });
    }

    const processedData = await ExcelProcessor.processFile(req.file.path);
    
    // Добавляем метаданные обработки
    processedData.metadata.statistics.processedAt = new Date();

    const dataModel = new Data({
      fileName: req.file.filename,
      documentType: processedData.documentType,
      companyName: processedData.companyName || 'Unknown',
      globalTags: processedData.globalTags,
      blocks: processedData.blocks,
      metadata: processedData.metadata,
      status: 'completed'
    });

    const savedData = await dataModel.save();

    res.json({
      success: true,
      data: savedData
    });

  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds limit'
      });
    }
    
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


