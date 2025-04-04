const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// Основной маршрут поиска
router.post('/', async (req, res) => {
    try {
        console.log('\n=== Поисковый запрос ===');
        console.log('Параметры поиска:', req.body);
        const { tags, blockType } = req.body;

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            console.log('❌ Ошибка: теги не указаны');
            return res.status(400).json({
                success: false,
                error: 'Не указаны теги для поиска'
            });
        }

        // Формируем запрос с учетом типа блока
        const query = {
            $or: [
                { globalTags: { $in: tags } },
                { 'blocks.tags': { $in: tags } }
            ]
        };

        if (blockType) {
            query['blocks.type'] = blockType;
        }

        const documents = await Data.find(query);
        console.log(`✅ Найдено документов: ${documents.length}`);

        const results = documents.map(doc => {
            // Фильтруем блоки по тегам и типу
            const matchingBlocks = doc.blocks.filter(block => 
                (block.tags.some(tag => tags.includes(tag)) || 
                doc.globalTags.some(tag => tags.includes(tag))) &&
                (!blockType || block.type === blockType)
            );

            return {
                _id: doc._id,
                fileName: doc.fileName,
                companyName: doc.companyName,
                uploadDate: doc.uploadDate,
                globalTags: doc.globalTags,
                matchingBlocks: matchingBlocks.map(block => ({
                    blockId: block.blockId,
                    type: block.type,
                    tags: block.tags
                }))
            };
        }).filter(doc => doc.matchingBlocks.length > 0);

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
        const { tags } = req.query;
        console.log('\n=== Запрос блоков файла ===');
        console.log('Параметры запроса:', { fileId, tags });

        const document = await Data.findById(fileId);
        
        if (!document) {
            console.log('❌ Документ не найден:', fileId);
            return res.status(404).json({
                success: false,
                error: 'Документ не найден'
            });
        }

        // Фильтруем блоки по тегам, если они указаны
        let blocks = document.blocks;
        if (tags && Array.isArray(tags) && tags.length > 0) {
            blocks = blocks.filter(block => 
                block.tags.some(tag => tags.includes(tag)) ||
                document.globalTags.some(tag => tags.includes(tag))
            );
        }

        // Форматируем блоки для ответа
        const formattedBlocks = blocks.map(block => {
            try {
                const formattedBlock = {
                    id: block.blockId,
                    type: block.type,
                    tags: block.tags,
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

        console.log(`✅ Найдено блоков: ${formattedBlocks.length}`);

        return res.json({
            success: true,
            count: formattedBlocks.length,
            blocks: formattedBlocks
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

        const document = await Data.findOne({ 'blocks.blockId': blockId });

        if (!document || !document.blocks) {
            console.log('❌ Блок не найден');
            return res.status(404).json({
                success: false,
                error: 'Блок не найден'
            });
        }

        const block = document.blocks.find(b => b.blockId === blockId);
        
        if (!block) {
            console.log('❌ Блок не найден в документе');
            return res.status(404).json({
                success: false,
                error: 'Блок не найден в документе'
            });
        }

        console.log('\n📦 Исходный блок из БД:', JSON.stringify(block, null, 2));

        if (block.type === 'table' && block.content) {
            try {
                if (!block.content.headers || !block.content.rows) {
                    throw new Error('Некорректная структура данных таблицы');
                }
        
                let matrix = [];
                
                // Добавляем заголовки
                const headers = block.content.headers.map(h => h.value || '');
                matrix.push(headers);
        
                // Добавляем строки данных
                block.content.rows.forEach((row) => {
                    if(!row.cells) return;
        
                    const rowData = [];
                    
                    // Обрабатываем каждую ячейку в строке
                    headers.forEach((_, index) => {
                        const cell = row.cells[index.toString()];
                        
                        if (!cell || cell.value === undefined || cell.value === null) {
                            rowData.push('');
                            return;
                        }
        
                        // Форматируем значение в зависимости от типа
                        let formattedValue = '';
                        switch (cell.type) {
                            case 'date':
                                try {
                                    const date = new Date(cell.value);
                                    if (!isNaN(date)) {
                                        formattedValue = date.toLocaleDateString('ru-RU');
                                    } else {
                                        formattedValue = cell.value.toString();
                                    }
                                } catch (e) {
                                    formattedValue = cell.value.toString();
                                }
                                break;
                            case 'number':
                                formattedValue = Number(cell.value).toLocaleString('ru-RU');
                                break;
                            case 'string':
                            default:
                                formattedValue = cell.value.toString();
                        }
                        rowData.push(formattedValue);
                    });
                    
                    matrix.push(rowData);
                });
        
                // Удаляем полностью пустые строки
                matrix = matrix.filter(row => row.some(cell => cell !== ''));
        
                if (matrix.length === 0 || matrix[0].length === 0) {
                    throw new Error('Пустая матрица после обработки');
                }
        
                // Добавляем информацию для PowerPoint
                return res.json({
                    success: true,
                    block: {
                        id: block.blockId,
                        type: 'table',
                        content: matrix,
                        dimensions: {
                            rows: matrix.length,
                            columns: matrix[0].length
                        },
                        formatting: {
                            hasHeaders: true,
                            firstRowAsHeaders: true,
                            autoFitColumns: true
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


