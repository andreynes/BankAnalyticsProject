const mongoose = require('mongoose');

/**
 * Схема для хранения данных из Excel файлов
 * @typedef {Object} DataSchema
 */
const dataSchema = new mongoose.Schema({
    // Имя загруженного файла
    fileName: {
        type: String,
        required: [true, 'Имя файла обязательно'],
        trim: true // Удаляет пробелы в начале и конце
    },
    
    // Дата загрузки файла
    uploadDate: {
        type: Date,
        default: Date.now,
        index: true // Индекс для оптимизации поиска по дате
    },
    
    // Массив данных из Excel
    data: [{
        // Данные одной строки в формате ключ-значение
        row: {
            type: Map,
            of: mongoose.Schema.Types.Mixed, // Может хранить любой тип данных
            required: [true, 'Данные строки обязательны']
        },
        // Номер строки в исходном файле
        rowNumber: {
            type: Number,
            required: true
        }
    }],
    
    // Теги для категоризации и поиска
    tags: [{
        type: String,
        lowercase: true, // Приводим к нижнему регистру для унификации
        trim: true
    }],
    
    // Метаданные файла
    metadata: {
        sheetName: String,     // Имя листа Excel
        totalRows: Number,     // Общее количество строк
        totalColumns: Number,  // Общее количество столбцов
        processedAt: Date,     // Дата обработки
        fileSize: Number       // Размер файла в байтах
    },
    
    // Статус обработки файла
    status: {
        type: String,
        enum: ['processed', 'failed', 'pending'],
        default: 'pending'
    },
    
    // Дата последнего изменения записи
    lastModified: {
        type: Date,
        default: Date.now
    }
});

// Индексы для оптимизации поиска
dataSchema.index({ tags: 1 });
dataSchema.index({ 'metadata.sheetName': 1 });

// Middleware: автоматическое обновление даты изменения
dataSchema.pre('save', function(next) {
    this.lastModified = new Date();
    next();
});

// Экспорт модели
module.exports = mongoose.model('Data', dataSchema);