// models/index.js

const mongoose = require('mongoose');

// Удаляем существующую модель, если она есть
if (mongoose.models.Data) {
  delete mongoose.models.Data;
}

const DataSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['excel', 'word', 'api']
  },
  companyName: {
    type: String,
    default: 'Unknown'
  },
  globalTags: [{
    type: String
  }],
  blocks: [{
    type: {
      type: String,
      required: true
    },
    source: String,
    content: Object,
    tags: [String],
    metadata: Object
  }],
  metadata: {
    format: {
      type: String,
      enum: ['yearly', 'monthly', 'daily', 'unknown'],
      default: 'unknown'
    },
    statistics: {
      rowCount: Number,
      columnCount: Number,
      processedAt: Date,
      fileSize: Number
    }
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'error'],
    default: 'processing'
  }
});

// Создаем и экспортируем модель
const Data = mongoose.model('Data', DataSchema);
module.exports = Data;


