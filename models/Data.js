'use strict';

const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  data: {
    // Здесь хранится массив строк, полученных после парсинга Excel
    type: Array,
    default: []
  },
  tags: {
    // Массив автотегов
    type: [String],
    default: []
  },
  metadata: {
    sheetName: {
      type: String
    },
    totalRows: {
      type: Number
    },
    totalColumns: {
      type: Number
    },
    processedAt: {
      type: Date
    },
    fileSize: {
      type: Number
    }
  },
  status: {
    type: String,
    default: 'processed'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Data', dataSchema);

