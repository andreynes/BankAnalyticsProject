const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Data = require('../models/Data');
const path = require('path');
const fs = require('fs');

// Создаем промежуточное ПО для обработки ошибок
const handleErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Ошибки multer
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ 
                    error: 'Файл слишком большой. Максимальный размер 5MB' 
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ 
                    error: 'Неожиданное поле формы' 
                });
            default:
                return res.status(400).json({ 
                    error: Ошибка загрузки файла: ${err.message} 
                });
        }
    } else if (err) {
        // Другие ошибки
        return res.status(500).json({ 
            error: Внутренняя ошибка сервера: ${err.message} 
        });
    }
    next();
};

// Добавляем проверку существования папки uploads
const ensureUploadsDirectory = () => {
    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir);
    }
};

// Настройка multer (оставляем как есть)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureUploadsDirectory();
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Улучшенный фильтр файлов
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

// Обновленный endpoint с обработкой ошибок
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'Файл не был загружен' 
            });
        }

        const excelData = processExcelFile(req.file.path);
        
        const newData = new Data({
            fileName: req.file.originalname,
            data: excelData.data,
            metadata: {
                sheetName: excelData.sheetName,
                totalRows: excelData.totalRows,
                totalColumns: excelData.totalColumns,
                fileSize: req.file.size
            },
            status: 'processed'
        });

        await newData.save();

        // Удаляем файл после обработки
        fs.unlinkSync(req.file.path);

        res.status(200).json({ 
            message: 'Файл успешно обработан и сохранен',
            fileId: newData._id,
            metadata: newData.metadata
        });

    } catch (error) {
        // Если файл существует, удаляем его в случае ошибки
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('Ошибка при обработке файла:', error);
        res.status(500).json({ 
            error: 'Ошибка при обработке файла',
            details: error.message 
        });
    }
});

// Добавляем обработчик ошибок
router.use(handleErrors);

module.exports = router;