const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models/Data');

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
      data: result.data,
      metadata: result.metadata,
      tags: result.metadata.tagging.tags
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

