'use strict';

const express = require('express');
const multer  = require('multer');
const path = require('path');
const router = express.Router();

// Импорт утилиты для обработки Excel и модели данных
const ExcelProcessor = require('../utils/excelProcessor');
const Data = require('../models/Data');

// Настройка хранилища для multer – файлы будут сохраняться в папке "uploads"
// Убедитесь, что папка uploads существует в корневой директории проекта
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    // Формирование уникального имени: текущее время + оригинальное имя файла
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// Обработчик для загрузки файла (POST-запрос на /upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Проверяем, что файл прикреплён
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не был прикреплен' });
    }
    console.log('Получен файл:', req.file);

    // Обработка Excel-файла через ExcelProcessor
    // Опция removeHeaderRow: true – если первая строка является заголовками, она исключается из данных
    const result = await ExcelProcessor.processFile(req.file.path, { removeHeaderRow: true });
    console.log('Результат обработки:', result);

    // Получаем теги из результата автотегирования
    // Если автотегирование не возвращает теги, устанавливаем дефолтный массив (например, тестовые теги)
    let tags = result.metadata.tagging && result.metadata.tagging.tags;
    if (!Array.isArray(tags) || tags.length === 0) {
      console.log("AutoTagger не сгенерировал теги, устанавливаем дефолтные");
      tags = ['default-tag'];
    }

    // Создаем документ для сохранения
    const dataDocument = new Data({
      fileName: req.file.originalname,
      uploadDate: new Date(),
      data: result.data,
      tags: tags,
      metadata: {
        sheetName: result.sheetName,
        totalRows: result.totalRows,
        totalColumns: result.totalColumns,
        processedAt: new Date(),
        fileSize: req.file.size,
        statistics: result.metadata.statistics || { 
          emptyValues: 0, 
          numericalColumns: ['Сумма продажи'], 
          categoricalColumns: [], 
          uniqueValuesCount: {} 
        }
      },
      status: 'processed',
      lastModified: new Date()
    });

    console.log("Сохраняем документ в базе...");
    await dataDocument.save();
    console.log("Документ сохранен:", dataDocument);

    res.status(200).json({
      message: 'Файл получен, обработан и данные сохранены',
      data: dataDocument
    });
  } catch (error) {
    console.error('Ошибка при обработке Excel файла:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


