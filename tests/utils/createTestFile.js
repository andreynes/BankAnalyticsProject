const xlsx = require('xlsx');
const path = require('path');

function createTestExcelFile() {
    // Создаем рабочую книгу
    const wb = xlsx.utils.book_new();
    
    // Создаем данные для теста
    const testData = [
        ['Имя', 'Возраст', 'Город'],
        ['Иван', 25, 'Москва'],
        ['Мария', 30, 'Санкт-Петербург']
    ];
    
    // Создаем лист
    const ws = xlsx.utils.aoa_to_sheet(testData);
    
    // Добавляем лист в книгу
    xlsx.utils.book_append_sheet(wb, ws, 'Тестовый лист');
    
    // Путь для сохранения файла
    const filePath = path.join(__dirname, '..', 'test-files', 'test.xlsx');
    
    // Сохраняем файл
    xlsx.writeFile(wb, filePath);
    
    return filePath;
}

module.exports = createTestExcelFile;