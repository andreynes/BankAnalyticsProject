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
        console.log('Processed data:', result); // для отладки

        const dataModel = new Data({
            fileName: req.file.originalname,
            uploadDate: new Date(),
            companyName: result.companyName,
            dates: result.dates,
            indicators: result.indicators,
            data: result.data,
            metadata: result.metadata,
            tags: [...result.metadata.tagging.tags, result.companyName.toLowerCase()]
        });

        console.log('Saving data model:', dataModel); // для отладки

        const savedData = await dataModel.save();
        console.log('Saved data:', savedData); // для отладки

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


