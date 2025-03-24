const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Data = require('../models/Data');
const ExcelProcessor = require('../utils/excelProcessor');
const TagAssigner = require('../utils/tagAssigner');

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
        cb(null, false);
        return cb(new Error('Принимаются только файлы Excel (.xls, .xlsx)'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('file');

router.post('/', (req, res) => {
    upload(req, res, async function(err) {
        try {
            // Обработка ошибок multer
            if (err instanceof multer.MulterError) {
                const errorData = await Data.create({
                    fileName: req.file ? req.file.originalname : 'unknown',
                    status: 'failed',
                    processingErrors: [{
                        code: 'MULTER_ERROR',
                        message: err.message
                    }]
                });
                return res.status(400).json({
                    success: false,
                    error: 'Ошибка загрузки файла',
                    details: err.message,
                    errorId: errorData._id
                });
            }

            // Обработка других ошибок загрузки
            if (err) {
                const errorData = await Data.create({
                    fileName: req.file ? req.file.originalname : 'unknown',
                    status: 'failed',
                    processingErrors: [{
                        code: 'UPLOAD_ERROR',
                        message: err.message
                    }]
                });
                return res.status(400).json({
                    success: false,
                    error: err.message,
                    errorId: errorData._id
                });
            }

            // Проверка наличия файла
            if (!req.file) {
                const errorData = await Data.create({
                    fileName: 'unknown',
                    status: 'failed',
                    processingErrors: [{
                        code: 'NO_FILE',
                        message: 'Файл не был загружен'
                    }]
                });
                return res.status(400).json({
                    success: false,
                    error: 'Файл не был загружен',
                    errorId: errorData._id
                });
            }

            // Обработка файла
            const tagAssigner = new TagAssigner();
            const processedData = await ExcelProcessor.processFile(req.file.path);
            const taggedData = tagAssigner.assignTags(processedData);

            // Создание записи в базе данных
            const dataModel = new Data({
                fileName: req.file.originalname,
                data: processedData.data,
                tags: taggedData.metadata.tagging.tags,
                metadata: {
                    sheetName: processedData.sheetName,
                    totalRows: processedData.totalRows,
                    totalColumns: processedData.totalColumns,
                    processedAt: new Date(),
                    fileSize: req.file.size,
                    columnTypes: processedData.metadata.columnTypes,
                    statistics: taggedData.metadata.tagging.statistics,
                    tagging: {
                        categories: taggedData.metadata.tagging.categories,
                        autoTags: taggedData.metadata.tagging.tags,
                        manualTags: []
                    }
                },
                status: 'processed'
            });

            const savedData = await dataModel.save();

            // Удаление временного файла после успешной обработки
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(200).json({
                success: true,
                message: 'Файл успешно обработан и сохранен',
                fileId: savedData._id,
                metadata: savedData.metadata,
                tags: savedData.tags
            });

        } catch (error) {
            // Удаление временного файла в случае ошибки
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            // Сохранение информации об ошибке
            try {
                const errorData = await Data.create({
                    fileName: req.file ? req.file.originalname : 'unknown',
                    status: 'failed',
                    processingErrors: [{
                        code: 'PROCESSING_ERROR',
                        message: error.message
                    }]
                });

                return res.status(400).json({
                    success: false,
                    error: 'Ошибка при обработке файла',
                    details: error.message,
                    errorId: errorData._id
                });
            } catch (dbError) {
                console.error('Ошибка при сохранении ошибки:', dbError);
                return res.status(500).json({
                    success: false,
                    error: 'Внутренняя ошибка сервера',
                    details: error.message
                });
            }
        }
    });
});

module.exports = router;



