const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
  fileName: {
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
  dates: [{
    type: String,
    required: true
  }],
  indicators: [{
    type: String,
    required: true
  }],
  data: [{
    rowNumber: Number,
    label: String,
    indicator: String,
    values: {
      type: Object,
      required: true
    },
    tags: [String]
  }],
  metadata: {
    format: {
      type: String,
      enum: ['yearly', 'monthly', 'daily', 'unknown'],
      default: 'monthly' // Изменено на monthly по умолчанию
    },
    statistics: {
      rowCount: Number,
      columnCount: Number,
      processedAt: Date,
      fileSize: Number
    },
    tagging: {
      tags: [String],
      tagCount: Number
    }
  },
  tags: [String],
  status: {
    type: String,
    enum: ['processing', 'completed', 'error'],
    default: 'completed'
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
    // Если два компонента (MM.YYYY)
    if (parts.length === 2) {
      return 'monthly';
    }
    // Если три компонента (DD.MM.YYYY), но первый компонент всегда '01'
    if (parts.length === 3 && parts[0] === '01') {
      return 'monthly';
    }
    // Если три компонента и первый не '01'
    if (parts.length === 3) {
      return 'daily';
    }
  }
  
  return 'monthly'; // По умолчанию используем monthly
}

// Middleware для автоматического определения формата дат
DataSchema.pre('save', function(next) {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.format) {
        this.metadata.format = 'monthly';
  }
  next();
});

module.exports = mongoose.model('Data', DataSchema);


