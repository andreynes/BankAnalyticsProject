// File: routes/search.js
// Маршруты для поиска и получения данных из базы данных

const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// Основной маршрут поиска
router.post('/', async (req, res) => {
    try {
        console.log('\n=== Поисковый запрос ===');
        console.log('Параметры поиска:', req.body);
        const { tags } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            console.log('❌ Ошибка: теги не указаны');
            return res.status(400).json({
                success: false,
                error: 'Не указаны теги для поиска'
            });
        }

        // Используем статический метод из модели
        const documents = await Data.findByTags(tags);

        console.log(`✅ Найдено документов: ${documents.length}`);

        const results = documents.map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            companyName: doc.companyName,
            uploadDate: doc.uploadDate,
            globalTags: doc.globalTags
        }));

        return res.json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка при выполнении поиска',
            details: error.message
        });
    }
});

// Получение блоков конкретного файла
router.get('/blocks/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        console.log('\n=== Запрос блоков файла ===');
        console.log('Параметры запроса:', { fileId });

        const document = await Data.findById(fileId);
        
        if (!document) {
            console.log('❌ Документ не найден:', fileId);
            return res.status(404).json({
                success: false,
                error: 'Документ не найден'
            });
        }

        // Получаем все блоки документа
        const blocks = document.blocks.map(block => {
            try {
                const formattedBlock = {
                    id: block.blockId,
                    type: block.type,
                    isOversized: false,
                    dimensions: null
                };

                if (block.type === 'table' && block.content) {
                    const rowCount = block.content.rows ? block.content.rows.length : 0;
                    const colCount = block.content.headers ? block.content.headers.length : 0;
                    
                    formattedBlock.dimensions = {
                        rows: rowCount,
                        columns: colCount
                    };
                    formattedBlock.isOversized = rowCount > 20 || colCount > 10;
                }

                return formattedBlock;
            } catch (err) {
                console.error('Ошибка обработки блока:', err);
                return null;
            }
        }).filter(block => block !== null);

        console.log(`✅ Найдено блоков: ${blocks.length}`);
        console.log('📊 Размеры блоков:', blocks.map(b => b.dimensions));

        return res.json({
            success: true,
            count: blocks.length,
            blocks: blocks
        });

    } catch (error) {
        console.error('❌ Ошибка при получении блоков:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка при получении блоков',
            details: error.message
        });
    }
});

// Получение конкретного блока для вставки
router.get('/block/:blockId', async (req, res) => {
    try {
        const { blockId } = req.params;
        console.log('\n=== Запрос блока ===');
        console.log('ID блока:', blockId);

        const document = await Data.findOne(
            { 'blocks.blockId': blockId }
        );

        if (!document || !document.blocks) {
            console.log('❌ Блок не найден');
            return res.status(404).json({
                success: false,
                error: 'Блок не найден'
            });
        }

        // Находим нужный блок
        const block = document.blocks.find(b => b.blockId === blockId);
        
        if (!block) {
            console.log('❌ Блок не найден в документе');
            return res.status(404).json({
                success: false,
                error: 'Блок не найден в документе'
            });
        }

        console.log('\n📦 Исходный блок из БД:', JSON.stringify(block, null, 2));

        // File: routes/search.js
        // В маршруте /block/:blockId замените блок обработки таблицы на следующий:

        if (block.type === 'table' && block.content) {
            try {
                // Проверяем наличие необходимых данных
                if (!block.content.headers || !block.content.rows) {
                    throw new Error('Некорректная структура данных таблицы');
                }

                // Создаем матрицу данных
                let matrix = [];
                
                // Добавляем заголовки
                const headers = block.content.headers.map(h => h.value || '');
                matrix.push(headers);

                // Добавляем строки данных
                block.content.rows.forEach((row) => {
                    if(!row.cells) return;

                    //Создаем массив для текущей строки
                    const rowData = [];
                    
                    // Обрабатываем каждую ячейку в строке
                    for (let i = 0; i < headers.length; i++) {
                        const cell = row.cells[i.toString()];
                        
                        if (!cell || cell.value == undefined || cell.value === null) {
                            rowData.push('');
                            continue;
                        }

                        switch (cell.type) {
                            case 'date':
                                try {
                                    const date = new Date(cell.value);
                                    rowData.push(date.toLocaleDateString('ru-RU'));
                                } catch (e) {
                                    rowData.push(cell.value.toString());
                                }
                                break;
                            case 'string':
                            case 'number':
                            default:
                                rowData.push(cell.value.toString());
                        }
                    }
                      
                    // Добавляем строку в матрицу
                    matrix.push(rowData);
                });

                // Удаляем полностью пустые строки
                matrix = matrix.filter(row => row.some(cell => cell !== ''));

                console.log('\n📊 Подготовленная матрица:', JSON.stringify(matrix, null, 2));

                // Проверяем, что матрица не пустая
                if (matrix.length === 0 || matrix[0].length === 0) {
                    throw new Error('Пустая матрица после обработки');
                }

                return res.json({
                    success: true,
                    block: {
                        id: block.blockId,
                        type: 'table',
                        content: matrix,
                        dimensions: {
                            rows: matrix.length,
                            columns: matrix[0].length
                        }
                    }
                });
                
            } catch (err) {
                console.error('❌ Ошибка обработки таблицы:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка обработки таблицы: ' + err.message
                });
            }
        }

        // Для текстовых блоков
        if (block.type === 'text') {
            return res.json({
                success: true,
                block: {
                    id: block.blockId,
                    type: 'text',
                    content: block.content && block.content.text ? block.content.text : ''
                }
            });
        }

        return res.status(400).json({
            success: false,
            error: 'Неподдерживаемый тип блока'
        });

    } catch (error) {
        console.error('❌ Ошибка при получении блока:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка при получении блока: ' + error.message
        });
    }
});

module.exports = router;


