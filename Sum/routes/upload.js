// routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models');

// Конфигурация хранилища
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        // Безопасное имя файла
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

// Проверка типа файла
const fileFilter = (req, file, cb) => {
    const allowedTypes = new Set(['.xlsx', '.xls']);
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.has(ext)) {
        return cb(new Error('Only Excel files are allowed'), false);
    }

    // Проверка MIME-типа
    const allowedMimes = new Set([
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]);
    
    if (!allowedMimes.has(file.mimetype)) {
        return cb(new Error('Invalid file type'), false);
    }

    cb(null, true);
};

// Конфигурация multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    }
});

// Очистка временных файлов
const cleanupFile = async (filePath) => {
    try {
        if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
            await fs.unlink(filePath);
        }
    } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
};

// Middleware для обработки ошибок multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'File size exceeds limit (max 10MB)'
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    if (err.message.includes('Only Excel files are allowed')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type. Only Excel files are allowed'
        });
    }

    next(err);
};

// Основной обработчик загрузки
router.post('/', upload.single('file'), handleMulterError, async (req, res) => {
    let filePath = null;

    try {
        // Проверка наличия файла
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        filePath = req.file.path;

        // Проверка размера файла
        const stats = await fs.stat(filePath);
        if (stats.size > 10 * 1024 * 1024) {
            await cleanupFile(filePath);
            return res.status(413).json({
                success: false,
                error: 'File size exceeds limit'
            });
        }

        // Обработка файла
        const processedData = await ExcelProcessor.processFile(filePath);
        
        // Добавляем метаданные
        const metadata = {
            ...processedData.metadata,
            upload: {
                originalName: req.file.originalname,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date()
            },
            processing: {
                startTime: new Date(),
                status: 'processing'
            }
        };

        // Создаем запись в базе данных
        const dataModel = new Data({
            fileName: req.file.filename,
            documentType: processedData.documentType || 'excel',
            companyName: processedData.companyName || 'Unknown',
            globalTags: processedData.globalTags || [],
            blocks: processedData.blocks || [],
            metadata: metadata,
            status: 'completed'
        });

        // Сохраняем в базу
        const savedData = await dataModel.save();

        // Обновляем метаданные о завершении обработки
        metadata.processing.endTime = new Date();
        metadata.processing.status = 'completed';
        metadata.processing.duration = 
            metadata.processing.endTime - metadata.processing.startTime;

        await Data.findByIdAndUpdate(savedData._id, {
            'metadata.processing': metadata.processing
        });

        // Отправляем успешный ответ
        res.status(200).json({
            success: true,
            data: {
                _id: savedData._id,
                fileName: savedData.fileName,
                documentType: savedData.documentType,
                blocks: savedData.blocks,
                globalTags: savedData.globalTags,
                metadata: metadata
            }
        });

    } catch (error) {
        console.error('Error processing file:', error);

        // Очищаем загруженный файл в случае ошибки
        if (filePath) {
            await cleanupFile(filePath);
        }

        // Определяем тип ошибки и отправляем соответствующий ответ
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid data format',
                details: error.message
            });
        }

        if (error.message.includes('File size exceeds')) {
            return res.status(413).json({
                success: false,
                error: error.message
            });
        }

        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;


