"use strict";

const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
  // Основные поля
  fileName: {
    type: String,
    required: true
  },
  
  uploadDate: {
    type: Date,
    default: Date.now
  },

  // Информация о компании
  companyName: {
    type: String,
    required: true,
    index: true
  },

  // Массив дат (периодов)
  dates: [{
    type: String,
    required: true
  }],

  // Массив показателей
  indicators: [{
    type: String,
    required: true
  }],

  // Данные из Excel
  data: [{
    rowNumber: Number,
    label: String,
    indicator: String,
    values: Map,
    tags: [String]
  }],

  // Метаданные
  metadata: {
    statistics: {
      rowCount: Number,
      columnCount: Number,
      processedAt: Date,
      fileSize: Number
    },
    tagging: {
      tags: [String],
      tagCount: Number
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    format: {
      type: String,
      enum: ['yearly', 'quarterly', 'monthly'],
      default: 'yearly'
    }
  },

  // Дополнительные поля для поиска и фильтрации
  years: [{
    type: String,
    index: true
  }],

  // Теги для поиска
  tags: {
    type: [String],
    index: true
  },

  // Статус обработки
  status: {
    type: String,
    enum: ['processing', 'completed', 'error'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Индексы для оптимизации поиска
DataSchema.index({ 'data.indicator': 1 });
DataSchema.index({ 'data.tags': 1 });
DataSchema.index({ uploadDate: -1 });
DataSchema.index({ companyName: 'text', 'data.indicator': 'text' });

// Виртуальное поле для получения последнего значения показателя
DataSchema.virtual('latestValues').get(function() {
  const result = new Map();
  if (this.dates && this.dates.length > 0) {
    const latestDate = this.dates[this.dates.length - 1];
    this.data.forEach(item => {
      result.set(item.indicator, item.values.get(latestDate));
    });
  }
  return result;
});

// Метод для получения значений конкретного показателя
DataSchema.methods.getIndicatorValues = function(indicator) {
  const dataRow = this.data.find(row => row.indicator === indicator);
  return dataRow ? dataRow.values : new Map();
};

// Метод для получения значений за определенный период
DataSchema.methods.getValuesByPeriod = function(startDate, endDate) {
  const result = new Map();
  const relevantDates = this.dates.filter(date => date >= startDate && date <= endDate);
  
  this.data.forEach(row => {
    const values = new Map();
    relevantDates.forEach(date => {
      values.set(date, row.values.get(date));
    });
    result.set(row.indicator, values);
  });
  
  return result;
};

// Статический метод для поиска по тегам
DataSchema.statics.findByTags = function(tags) {
  return this.find({
    tags: {
      $all: Array.isArray(tags) ? tags : [tags]
    }
  });
};

// Статический метод для поиска по компании и показателю
DataSchema.statics.findByCompanyAndIndicator = function(company, indicator) {
  return this.find({
    companyName: company,
    'data.indicator': indicator
  });
};

// Middleware для предварительной обработки перед сохранением
DataSchema.pre('save', function(next) {
  // Извлекаем годы из дат
  this.years = [...new Set(this.dates.map(date => {
    if (date.includes('.')) {
      return date.split('.').pop();
    }
    return date;
  }))];

  // Обновляем количество тегов
  if (this.metadata && this.metadata.tagging) {
    this.metadata.tagging.tagCount = this.metadata.tagging.tags.length;
  }

  // Определяем формат дат
  if (this.dates.length > 0) {
    const firstDate = this.dates[0];
    if (firstDate.length === 4) {
      this.metadata.format = 'yearly';
    } else if (firstDate.includes('.') && firstDate.split('.').length === 2) {
      this.metadata.format = 'monthly';
    } else {
      this.metadata.format = 'quarterly';
    }
  }

  next();
});

const Data = mongoose.model('Data', DataSchema);

module.exports = Data;


