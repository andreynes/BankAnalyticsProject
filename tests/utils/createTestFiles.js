// tests/utils/createTestFiles.js

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Создание тестового Excel файла
 * @param {string} filePath - Путь для сохранения файла
 * @param {Object} options - Опции для создания файла
 * @returns {Promise<void>}
 */
async function createExcelTestFile(filePath, options = {}) {
    const workbook = xlsx.utils.book_new();
    
    // Настройка базовых параметров
    const headers = options.headers || ['Test Column'];
    const data = options.data || [[1], [2], [3]];
    const metadata = options.metadata || {
        title: 'Test File',
        author: 'Test System',
        company: 'Test Company',
        category: 'Test'
    };
    
    // Создание основного листа
    const wsData = [headers, ...data];
    const worksheet = xlsx.utils.aoa_to_sheet(wsData);

    // Добавление метаданных
    worksheet['!meta'] = {
        Creator: metadata.author,
        LastModifiedBy: metadata.author,
        CreatedDate: new Date(),
        ModifiedDate: new Date(),
        Company: metadata.company,
        Category: metadata.category,
        Title: metadata.title
    };

    // Настройка форматирования
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = xlsx.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cell_address];
            
            if (!cell) continue;

            // Форматирование заголовков
            if (R === 0) {
                cell.s = {
                    font: { bold: true },
                    alignment: { horizontal: 'center' }
                };
            }

            // Форматирование чисел
            if (typeof cell.v === 'number') {
                cell.z = cell.v % 1 === 0 ? '#,##0' : '#,##0.00';
            }

            // Форматирование дат
            if (cell.v instanceof Date) {
                cell.z = 'yyyy-mm-dd';
            }
        }
    }

    // Добавление объединенных ячеек если указано
    if (options.mergedCells) {
        worksheet['!merges'] = options.mergedCells;
    }

    // Установка ширины столбцов
    const colWidths = {};
    for (let C = range.s.c; C <= range.e.c; ++C) {
        colWidths[C] = { wch: 15 }; // width in characters
    }
    worksheet['!cols'] = colWidths;

    // Добавление основного листа
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Создание дополнительных листов для больших файлов
    if (options.size === 'large') {
        // Создаем множество листов для увеличения размера файла
        for (let i = 0; i < 100; i++) {
            const largeData = Array(1000).fill(['Large file test data ' + i]);
            const largeSheet = xlsx.utils.aoa_to_sheet(largeData);
            xlsx.utils.book_append_sheet(workbook, largeSheet, `Sheet${i + 2}`);
        }
    }

    // Добавление листа с мультизаголовками если указано
    if (options.multiLevelHeaders) {
        const multiHeader = options.multiLevelHeaders;
        const multiSheet = xlsx.utils.aoa_to_sheet([
            multiHeader.level1,
            multiHeader.level2,
            ...multiHeader.data
        ]);
        xlsx.utils.book_append_sheet(workbook, multiSheet, 'MultiLevel');
    }

    // Создание директории если не существует
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Сохранение файла
    try {
        xlsx.writeFile(workbook, filePath);
        console.log('Test files created successfully');
    } catch (error) {
        console.error('Error creating test file:', error);
        throw error;
    }
}

/**
 * Создание тестового текстового файла
 * @param {string} filePath - Путь для сохранения файла
 * @param {string} content - Содержимое файла
 */
function createTextFile(filePath, content = 'Test content') {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
}

/**
 * Создание большого тестового файла
 * @param {string} filePath - Путь для сохранения файла
 * @param {number} sizeInMB - Размер файла в мегабайтах
 */
function createLargeFile(filePath, sizeInMB = 17) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const fd = fs.openSync(filePath, 'w');
    const size = sizeInMB * 1024 * 1024;
    fs.writeSync(fd, Buffer.alloc(size));
    fs.closeSync(fd);
}

/**
 * Создание тестовых файлов для всех тестов
 */
async function createAllTestFiles() {
    const testDir = path.join(__dirname, '../test-files');
    
    // Создание простого Excel файла
    await createExcelTestFile(path.join(testDir, 'test.xlsx'), {
        headers: ['Date', 'Revenue', 'Profit'],
        data: [
            ['2023-01-01', 1000, 500],
            ['2023-02-01', 2000, 1000],
            ['2023-03-01', 3000, 1500]
        ]
    });

    // Создание файла с мультизаголовками
    await createExcelTestFile(path.join(testDir, 'multi-level.xlsx'), {
        multiLevelHeaders: {
            level1: ['Category', 'Q1', 'Q1', 'Q2', 'Q2'],
            level2: ['', 'Revenue', 'Profit', 'Revenue', 'Profit'],
            data: [
                ['Product A', 1000, 500, 1200, 600],
                ['Product B', 2000, 1000, 2400, 1200]
            ]
        }
    });

    // Создание пустого Excel файла
    await createExcelTestFile(path.join(testDir, 'empty.xlsx'), {
        headers: [],
        data: []
    });

    // Создание текстового файла
    createTextFile(path.join(testDir, 'test.txt'));

    // Создание JSON файла с тестовыми данными API
    const apiTestData = {
        revenue: {
            q1: { value: 1000, growth: '10%' },
            q2: { value: 1200, growth: '20%' }
        },
        profit: {
            q1: { value: 500, margin: '50%' },
            q2: { value: 600, margin: '50%' }
        }
    };
    fs.writeFileSync(
        path.join(testDir, 'api-test-data.json'),
        JSON.stringify(apiTestData, null, 2)
    );
}

// Запуск создания тестовых файлов если скрипт запущен напрямую
if (require.main === module) {
    createAllTestFiles().catch(console.error);
}

module.exports = {
    createExcelTestFile,
    createTextFile,
    createLargeFile,
    createAllTestFiles
};


