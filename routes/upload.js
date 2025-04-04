const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models/Data');

// Настройка хранилища для multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Настройка фильтра файлов
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv' // csv
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый тип файла. Разрешены только Excel файлы (xlsx, xls) и CSV.'), false);
    }
};

// Настройка multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB лимит
    }
});

// Маршрут для загрузки файла
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const excelProcessor = new ExcelProcessor();
        const processedData = await excelProcessor.processFile(req.file.path);
        
        // Создаем документ с блоками
        const document = new Data({
            fileName: req.file.originalname,
            filePath: req.file.path,
            companyName: extractCompanyName(req.file.originalname),
            documentType: 'excel',
            blocks: [], // Будем заполнять блоками
            metadata: {
                format: 'monthly',
                statistics: {
                    fileSize: req.file.size,
                    processedAt: new Date()
                },
                source: {
                    type: 'excel',
                    mimeType: req.file.mimetype,
                    originalName: req.file.originalname
                }
            }
        });

        // Добавляем блоки из каждого листа
        processedData.data.forEach(sheet => {
            document.blocks.push(...sheet.blocks);
        });

        // Добавляем глобальные теги
        document.globalTags = processedData.tags;

        await document.save();
        res.json({ success: true, documentId: document._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Вспомогательные функции
function extractCompanyName(filename) {
    // Удаляем расширение и специальные символы
    return filename
        .replace(/\.[^/.]+$/, "") // удаляем расширение
        .replace(/[_-]/g, " ") // заменяем подчеркивания и дефисы на пробелы
        .replace(/\d+$/, "") // удаляем цифры в конце
        .trim();
}

function determineDataFormat(processedData) {
    // Пытаемся определить формат по заголовкам
    const headers = processedData.data[0]?.headers || [];
    const headerValues = headers.map(h => h.value || '').join(' ').toLowerCase();
    
    if (headerValues.includes('год')) return 'yearly';
    if (headerValues.includes('месяц')) return 'monthly';
    if (headerValues.includes('день') || headerValues.includes('дата')) return 'daily';
    
    return 'unknown';
}

// Обработка ошибок multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Файл слишком большой',
                details: 'Максимальный размер файла - 10MB'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Неверное имя поля для файла',
                details: 'Используйте поле "file" для загрузки'
            });
        }
    }
    
    return res.status(500).json({
        success: false,
        error: 'Ошибка при загрузке файла',
        details: error.message
    });
});

module.exports = router;


