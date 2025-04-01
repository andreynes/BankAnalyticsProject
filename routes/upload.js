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
router.post('/', upload.single('file'), async (req, res) => {
    console.log('Получен файл:', req.file);
    console.log('Тело запроса:', req.body);
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Файл не был загружен',
                details: 'Файл отсутствует в запросе'
            });
        }

        // Создаем экземпляр процессора Excel
        const processor = new ExcelProcessor();
        
        // Обрабатываем файл
        console.log('Processing file:', req.file.path);
        const processedData = await processor.processFile(req.file.path);
        
        // Извлекаем название компании из имени файла
        const companyName = extractCompanyName(req.file.originalname);

        // Создаем блоки данных
        const blocks = processedData.data.map((sheet, index) => ({
            blockId: `block_${index}`,
            type: 'table',
            source: {
                type: 'excel',
                details: new Map([
                    ['sheetName', sheet.sheetName],
                    ['sheetIndex', index]
                ])
            },
            content: {
                headers: sheet.headers,
                rows: sheet.rows
            },
            tags: [...processedData.tags], // Добавляем теги к каждому блоку
            metadata: {
                rowCount: sheet.rows.length,
                columnCount: sheet.headers.length,
                hasFormulas: false,
                dateFormat: 'YYYY-MM-DD',
                numberFormat: 'general'
            }
        }));

        // Создаем запись в базе данных
        const dataDocument = new Data({
            fileName: req.file.originalname,
            filePath: req.file.path,
            uploadDate: new Date(),
            companyName: companyName,
            documentType: 'excel',
            globalTags: processedData.tags,
            blocks: blocks,
            metadata: {
                format: determineDataFormat(processedData),
                statistics: {
                    totalBlocks: blocks.length,
                    totalRows: processedData.metadata.totalRows,
                    processedAt: new Date(),
                    fileSize: req.file.size
                },
                source: {
                    type: 'excel',
                    mimeType: req.file.mimetype,
                    originalName: req.file.originalname
                }
            },
            status: 'complete'
        });

        // Сохраняем в базу данных
        await dataDocument.save();

        // Отправляем успешный ответ
        res.status(200).json({
            success: true,
            message: 'Файл успешно загружен и обработан',
            file: {
                id: dataDocument._id,
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path
            },
            data: {
                companyName: companyName,
                blocks: blocks.length,
                totalRows: processedData.metadata.totalRows,
                tags: processedData.tags
            },
            metadata: {
                processedAt: new Date(),
                status: 'complete'
            }
        });

    } catch (error) {
        console.error('Ошибка при обработке файла:', error);
        
        // Отправляем ответ с ошибкой
        res.status(500).json({
            success: false,
            error: 'Ошибка при обработке файла',
            details: error.message,
            metadata: {
                processedAt: new Date(),
                status: 'failed'
            }
        });
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


