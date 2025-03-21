require('dotenv').config();
const mongoose = require('mongoose');
const Data = require('../models/Data');

// Тестовые данные
const testData = {
    fileName: 'test_file.xlsx',
    data: [{
        row: new Map([
            ['A1', 'Тестовое значение'],
            ['B1', 123]
        ]),
        rowNumber: 1
    }],
    tags: ['Тест', 'Пример'],
    metadata: {
        sheetName: 'Лист1',
        totalRows: 1,
        totalColumns: 2,
        fileSize: 1024
    }
};

// Функция для создания тестовой записи
async function createTestRecord() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Подключение к MongoDB успешно установлено');

        const newData = new Data(testData);
        const savedData = await newData.save();
        console.log('Тестовая запись создана:', savedData);

        await mongoose.connection.close();
        console.log('Подключение к MongoDB закрыто');
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Запускаем создание тестовой записи
createTestRecord();