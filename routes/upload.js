const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Data = require('../models/Data');
const ExcelParser = require('../utils/excelParser');

// Настройка multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Принимаются только файлы Excel (.xls, .xlsx)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// POST endpoint для загрузки файла
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'Файл не был загружен' 
            });
        }

        // Парсим Excel файл
        const parseResult = await ExcelParser.parse(req.file.path);
        
        // Проверяем результат парсинга
        if (!parseResult.success) {
            throw new Error(`Ошибка парсинга файла: ${parseResult.error}`);
        }

        // Валидируем данные
        const validation = ExcelParser.validateData(parseResult);
        if (!validation.isValid) {
            throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
        }

        // Создаем запись в базе данных
        const newData = new Data({
            fileName: req.file.originalname,
            data: parseResult.data,
            metadata: parseResult.metadata,
            tags: parseResult.metadata.suggestedTags,
            status: 'processed'
        });

        await newData.save();

        // Удаляем временный файл
        fs.unlinkSync(req.file.path);

        res.status(200).json({ 
            success: true,
            message: 'Файл успешно обработан и сохранен',
            fileId: newData._id,
            metadata: newData.metadata,
            suggestedTags: newData.tags
        });

    } catch (error) {
        console.error('Ошибка при обработке файла:', error);
        
        // Удаляем временный файл в случае ошибки
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;