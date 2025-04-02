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


        res.json({
            success: true,
            results: results
        });


    } catch (error) {
        console.error('❌ Ошибка поиска:', error);
        res.status(500).json({
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


        // Получаем все блоки документа
        const blocks = document.blocks.map(block => {
            const formattedBlock = {
                id: block.blockId,
                type: block.type,
                content: block.content,
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
        });


        console.log(`✅ Найдено блоков: ${blocks.length}`);
        console.log('📊 Размеры блоков:', blocks.map(b => b.dimensions));


        res.json({
            success: true,
            count: blocks.length,
            blocks: blocks
        });


    } catch (error) {
        console.error('❌ Ошибка при получении блоков:', error);
        res.status(500).json({
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
            { 'blocks.blockId': blockId },
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

        // Проверяем и форматируем блок
        if (block.type === 'table' && block.content) {
            // Создаем матрицу данных для таблицы
            const matrix = [];
            
            // Добавляем строку заголовков
            const headerRow = block.content.headers.map(h => h.value || '');
            matrix.push(headerRow);

            // Добавляем строки данных
            block.content.rows.forEach(row => {
                const rowData = [];
                for (let i = 0; i < headerRow.length; i++) {
                    const cell = row.cells[i] || row.cells[i.toString()];
                    rowData.push(cell && cell.value ? cell.value.toString() : '');
                }
                matrix.push(rowData);
            });

            console.log('\n📊 Подготовленная матрица:', JSON.stringify(matrix, null, 2));


            return res.json({
                success: true,
                block: {
                    id: block.blockId,
                    type: 'table',
                    content: matrix
                }
            });
        }


        // Для текстовых блоков
        return res.json({
            success: true,
            block: {
                id: block.blockId,
                type: 'text',
                content: block.content.text || ''
            }
        });


    } catch (error) {
        console.error('❌ Ошибка при получении блока:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении блока: ' + error.message
        });
    }
});

module.exports = router;



