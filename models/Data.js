const mongoose = require('mongoose');

// Схема для структуры заголовков (многоуровневые заголовки)
const HeaderSchema = new mongoose.Schema({
    value: String,
    level: Number,
    parent: String,
    children: [String]
}, { _id: false });

// Схема для значений в ячейках
const CellValueSchema = new mongoose.Schema({
    value: mongoose.Schema.Types.Mixed,
    format: String, // number, text, date, etc.
    metadata: Map
}, { _id: false });

// Схема для блока данных (таблица или текст)
const DataBlockSchema = new mongoose.Schema({
    blockId: String,
    type: {
        type: String,
        enum: ['table', 'text', 'api'],
        required: true
    },
    source: {
        type: {
            type: String,
            enum: ['excel', 'word', 'api'],
            required: true
        },
        details: Map // Дополнительная информация об источнике
    },
    content: {
        // Для текстового блока
        text: String,
        
        // Для табличного блока
        headers: [HeaderSchema],
        rows: [{
            rowNumber: Number,
            cells: Map, // Ключ - id колонки, значение - CellValueSchema
            metadata: Map
        }],
        
        // Для API блока
        apiData: Map
    },
    structure: {
        levels: Number, // Количество уровней в структуре
        hierarchyMap: Map // Карта связей между уровнями
    },
    tags: [String] // Теги для конкретного блока
}, { _id: false });

// Основная схема документа
const DataSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    companyName: {
        type: String,
        required: true
    },
    documentType: {
        type: String,
        enum: ['excel', 'word', 'api'],
        required: true,
        default: 'excel'
    },
    globalTags: [String], // Общие теги для всего документа
    blocks: [DataBlockSchema], // Массив блоков данных
    metadata: {
        format: {
            type: String,
            enum: ['yearly', 'monthly', 'daily', 'unknown'],
            default: 'monthly'
        },
        statistics: {
            totalBlocks: Number,
            totalRows: Number,
            processedAt: Date,
            fileSize: Number
        },
        source: {
            type: {
              type: String,
              enum: ['excel', 'word', 'api'],
              default: 'excel'
            },
            mimeType: String,
            originalName: String,
            processingTime: Number,
            additionalDetails: Map
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'complete', 'failed'],
        default: 'pending'
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
});

// Функция определения формата даты
function determineDateFormat(dateStr) {
    if (!dateStr) return 'unknown';
    
    // Для формата YYYY
    if (/^\d{4}$/.test(dateStr)) {
        return 'yearly';
    }
    
    // Для формата MM.YYYY или DD.MM.YYYY
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 2) return 'monthly';
        if (parts.length === 3 && parts[0] === '01') return 'monthly';
        if (parts.length === 3) return 'daily';
    }
    
    return 'monthly';
}

// Middleware для предварительной обработки
DataSchema.pre('save', function(next) {
    // Инициализация metadata если отсутствует
    if (!this.metadata) {
        this.metadata = {};
    }
    
    // Подсчет статистики
    this.metadata.statistics = {
        totalBlocks: this.blocks.length,
        totalRows: this.blocks.reduce((acc, block) => {
            return acc + (block.type === 'table' ? block.content.rows.length : 0);
        }, 0),
        processedAt: new Date(),
        fileSize: this.metadata.statistics?.fileSize || 0
    };

    // Обновление lastModified
    this.lastModified = new Date();
    
    next();
});

// Методы для работы с тегами
DataSchema.methods.addGlobalTag = function(tag) {
    if (!this.globalTags.includes(tag)) {
        this.globalTags.push(tag);
    }
};

DataSchema.methods.addBlockTag = function(blockId, tag) {
    const block = this.blocks.find(b => b.blockId === blockId);
    if (block && !block.tags.includes(tag)) {
        block.tags.push(tag);
    }
};

// Статические методы для поиска
DataSchema.statics.findByTags = function(tags) {
    return this.find({
        $or: [
            { globalTags: { $all: tags } },
            { 'blocks.tags': { $all: tags } }
        ]
    });
};

// Индексы для оптимизации
DataSchema.index({ globalTags: 1 });
DataSchema.index({ 'blocks.type': 1 });
DataSchema.index({ 'blocks.tags': 1 });
DataSchema.index({ 'blocks.blockId': 1 });
DataSchema.index({ uploadDate: -1 });
DataSchema.index({ status: 1 });
DataSchema.index({ companyName: 1 });

const Data = mongoose.model('Data', DataSchema);

module.exports = Data;


