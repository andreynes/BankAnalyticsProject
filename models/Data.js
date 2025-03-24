const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: [true, 'Имя файла обязательно'],
        trim: true
    },
    uploadDate: {
        type: Date,
        default: Date.now,
        index: true // Индекс для быстрого поиска по дате
    },
    data: [{
        row: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            required: [true, 'Данные строки обязательны']
        },
        rowNumber: {
            type: Number,
            required: true
        }
    }],
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    metadata: {
        sheetName: String,
        totalRows: Number,
        totalColumns: Number,
        processedAt: Date,
        fileSize: Number,
        columnTypes: {
            type: Map,
            of: String
        },
        statistics: {
            emptyValues: Number,
            numericalColumns: [String],
            categoricalColumns: [String]
        },
        tagging: {
            categories: {
                business: [String],
                technical: [String],
                content: [String],
                other: [String]
            },
            autoTags: [String],
            manualTags: [String]
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'processed', 'failed'],
        default: 'pending'
    },
    processingErrors: [{
        code: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    lastModified: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Автоматически добавляет createdAt и updatedAt
});

// Индексы для быстрого поиска
dataSchema.index({ tags: 1 });
dataSchema.index({ 'metadata.sheetName': 1 });
dataSchema.index({ status: 1 });
dataSchema.index({ 'metadata.columnTypes': 1 });

// Middleware перед сохранением
dataSchema.pre('save', function(next) {
    this.lastModified = new Date();
    next();
});

// Виртуальное свойство для получения возраста документа
dataSchema.virtual('age').get(function() {
    return Math.round((Date.now() - this.uploadDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Методы экземпляра
dataSchema.methods.addTag = function(tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        this.markModified('tags');
    }
};

dataSchema.methods.removeTag = function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.markModified('tags');
};

// Статические методы
dataSchema.statics.findByTag = function(tag) {
    return this.find({ tags: tag });
};

dataSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        uploadDate: {
            $gte: startDate,
            $lte: endDate
        }
    });
};

// Создаем и экспортируем модель
const Data = mongoose.model('Data', dataSchema);

module.exports = Data;