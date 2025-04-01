// routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelProcessor = require('../utils/excelProcessor');

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 16 * 1024 * 1024 // 16MB
    }
});

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const processor = new ExcelProcessor();
        const result = await processor.process(req.file.path);

        // Добавляем метаданные файла
        result.metadata = {
            ...result.metadata,
            fileInfo: {
                ...result.metadata.fileInfo,
                fileSize: req.file.size,
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                uploadDate: new Date()
            }
        };

        // Обеспечиваем наличие тегов
        if (!result.tags) {
            result.tags = [];
        }

        // Добавляем базовые теги
        const year = new Date().getFullYear().toString();
        if (!result.tags.includes(year)) {
            result.tags.push(year);
        }

        // Добавляем бизнес-метрики в теги
        const metrics = ['revenue', 'profit', 'margin', 'growth', 'sales'];
        metrics.forEach(metric => {
            if (JSON.stringify(result).toLowerCase().includes(metric) && !result.tags.includes(metric)) {
                result.tags.push(metric);
            }
        });

        // Очистка временного файла
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        res.status(200).json(result);
    } catch (error) {
        // Очистка временного файла в случае ошибки
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        }

        if (error.message.includes('File too large')) {
            return res.status(413).json({ error: 'File too large' });
        }

        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({ error: 'Invalid file type' });
        }

        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;


