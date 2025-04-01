const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// Основной маршрут поиска
router.post('/', async (req, res) => {
    try {
        console.log('Получен поисковый запрос:', req.body);
        const { tag } = req.body;

        if (!tag) {
            return res.status(400).json({
                success: false,
                error: 'Не указан тег для поиска'
            });
        }

        // Строим запрос для поиска по тегам
        const query = {
            $or: [
                { globalTags: { $regex: `^${tag}$`, $options: 'i' } },
                { 'blocks.tags': { $regex: `^${tag}$`, $options: 'i' } }
            ]
        };

        console.log('MongoDB query:', JSON.stringify(query, null, 2));

        // Cначала проверим, есть ли документы с таким тегом
        const count = await Data.countDocuments(query);
        console.log(`Найдено документов по тегу "${tag}": ${count}`)

        // Получаем документы
        const documents = await Data.find(query)
            .select({
                fileName: 1,
                companyName: 1,
                uploadDate: 1,
                globalTags: 1
            })
            .sort({ uploadDate: -1 });

        // Логируем найденные документы
        documents.forEach(doc => {
            console.log(`Найден документ: ${doc.fileName}, теги:` , doc.globalTags);
        });

        res.json({
            success: true,
            count: documents.length,
            results: documents
        });

    } catch (error) {
        console.error('Ошибка поиска:', error);
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
        const { tag } = req.query;

        console.log('Запрос блоков для файла:', { fileId, tag });

        const document = await Data.findById(fileId);
        
        if (!document) {
            console.log('Документ не найден:', fileId);
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
                formattedBlock.isOversized = rowCount > 6 || colCount > 6;
            }

            return formattedBlock;
        });

        console.log(`Найдено блоков: ${blocks.length}`);
        console.log('Размеры блоков:', blocks.map(b => b.dimensions));

        res.json({
            success: true,
            count: blocks.length,
            blocks: blocks
        });

    } catch (error) {
        console.error('Ошибка при получении блоков:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении блоков',
            details: error.message
        });
    }
});

// Уточнение блока по дополнительным тегам
router.post('/refine-block/:blockId', async (req, res) => {
    try {
        const { blockId } = req.params;
        const { tags } = req.body;

        console.log('Запрос на уточнение блока:', { blockId, tags });

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны теги для уточнения'
            });
        }

        const document = await Data.findOne({ 'blocks.blockId': blockId });
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Блок не найден'
            });
        }

        const block = document.blocks.find(b => b.blockId === blockId);
        if (!block || block.type !== 'table') {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип блока'
            });
        }

        // Фильтруем данные таблицы по тегам
        const refinedBlock = await refineTableData(block, tags);
        console.log('Уточненный блок:', {
            originalSize: {
                rows: block.content.rows.length,
                columns: block.content.headers.length
            },
            refinedSize: {
                rows: refinedBlock.content.rows.length,
                columns: refinedBlock.content.headers.length
            }
        });

        const isOversized = refinedBlock.content.rows.length > 6 || 
                          refinedBlock.content.headers.length > 6;

        res.json({
            success: true,
            block: {
                id: refinedBlock.blockId,
                type: 'table',
                content: refinedBlock.content,
                dimensions: {
                    rows: refinedBlock.content.rows.length,
                    columns: refinedBlock.content.headers.length
                },
                isOversized: isOversized
            }
        });

    } catch (error) {
        console.error('Ошибка при уточнении блока:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при уточнении блока',
            details: error.message
        });
    }
});

// Получение конкретного блока для вставки
router.get('/block/:blockId', async (req, res) => {
    try {
        const { blockId } = req.params;
        console.log('Запрос блока:', blockId);

        const document = await Data.findOne(
            { 'blocks.blockId': blockId },
            { 'blocks.$': 1 }
        );

        if (!document || !document.blocks || !document.blocks.length) {
            return res.status(404).json({
                success: false,
                error: 'Блок не найден'
            });
        }

        const block = document.blocks[0];

        // Проверяем размер таблицы перед отправкой
        if (block.type === 'table' && block.content) {
            const rowCount = block.content.rows.length;
            const colCount = block.content.headers.length;

            if (rowCount > 6 || colCount > 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Размер таблицы превышает допустимый (6x6)',
                    dimensions: { rows: rowCount, columns: colCount }
                });
            }

            // Форматируем данные таблицы
            const formattedBlock = {
                id: block.blockId,
                type: 'table',
                content: {
                    headers: block.content.headers.map(h => h.value || ''),
                    rows: block.content.rows.map(row => 
                        Array.from(row.cells.values()).map(cell => 
                            cell.value ? cell.value.toString().trim() : ''
                        )
                    )
                },
                dimensions: {
                    rows: rowCount,
                    columns: colCount
                }
            };

            return res.json({
                success: true,
                block: formattedBlock
            });
        }

        // Для текстовых блоков
        const formattedBlock = {
            id: block.blockId,
            type: 'text',
            content: {
                text: block.content.text || ''
            }
        };

        res.json({
            success: true,
            block: formattedBlock
        });

    } catch (error) {
        console.error('Ошибка при получении блока:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении блока',
            details: error.message
        });
    }
});

// Вспомогательная функция для фильтрации данных таблицы
async function refineTableData(block, tags) {
    // Создаем копию блока
    const refinedBlock = {
        ...block,
        content: {
            headers: block.content.headers,
            rows: block.content.rows.filter(row => {
                const rowValues = Array.from(row.cells.values())
                    .map(cell => cell.value ? cell.value.toString().toLowerCase() : '');
                return tags.some(tag => 
                    rowValues.some(value => value.includes(tag.toLowerCase()))
                );
            })
        }
    };

    return refinedBlock;
}

// Маршрут для отладки - получение всех тегов
router.get('/debug/tags', async (req, res) => {
    try {
        const allTags = await Data.distinct('globalTags');
        const blockTags = await Data.distinct('blocks.tags');
        
        res.json({
            success: true,
            globalTags: allTags,
            blockTags: blockTags
        });
    } catch (error) {
        console.error('Ошибка при получении тегов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении тегов',
            details: error.message
        });
    }
});

// Маршрут для отладки - получение структуры документа
router.get('/debug/document/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const document = await Data.findById(fileId);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Документ не найден'
            });
        }

        res.json({
            success: true,
            document: {
                fileName: document.fileName,
                companyName: document.companyName,
                globalTags: document.globalTags,
                blocksCount: document.blocks.length,
                blocks: document.blocks.map(block => ({
                    id: block.blockId,
                    type: block.type,
                    tags: block.tags,
                    dimensions: block.type === 'table' && block.content ? {
                        rows: block.content.rows ? block.content.rows.length : 0,
                        columns: block.content.headers ? block.content.headers.length : 0
                    } : null,
                    hasContent: !!block.content
                }))
            }
        });
    } catch (error) {
        console.error('Ошибка при получении документа:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении документа',
            details: error.message
        });
    }
});

// Маршрут для отладки - проверка данных блока
router.get('/debug/block/:blockId', async (req, res) => {
    try {
        const { blockId } = req.params;
        const document = await Data.findOne(
            { 'blocks.blockId': blockId },
            { 'blocks.$': 1 }
        );

        if (!document || !document.blocks || !document.blocks.length) {
            return res.status(404).json({
                success: false,
                error: 'Блок не найден'
            });
        }

        const block = document.blocks[0];
        
        // Анализируем структуру данных блока
        const analysis = {
            blockId: block.blockId,
            type: block.type,
            hasContent: !!block.content,
            contentStructure: block.type === 'table' ? {
                hasHeaders: !!block.content.headers,
                headerCount: block.content.headers ? block.content.headers.length : 0,
                headerTypes: block.content.headers ? 
                    block.content.headers.map(h => ({
                        value: h.value,
                        type: typeof h.value
                    })) : [],
                hasRows: !!block.content.rows,
                rowCount: block.content.rows ? block.content.rows.length : 0,
                sampleRow: block.content.rows && block.content.rows.length > 0 ?
                    Array.from(block.content.rows[0].cells.values()).map(cell => ({
                        value: cell.value,
                        type: typeof cell.value
                    })) : []
            } : {
                textLength: block.content.text ? block.content.text.length : 0
            }
        };

        res.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error('Ошибка при анализе блока:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при анализе блока',
            details: error.message
        });
    }
});

// Вспомогательные функции
function validateDimensions(block) {
    if (block.type !== 'table' || !block.content) {
        return true;
    }

    const rowCount = block.content.rows ? block.content.rows.length : 0;
    const colCount = block.content.headers ? block.content.headers.length : 0;

    return rowCount <= 6 && colCount <= 6;
}

function formatTableData(rows) {
    return rows.map(row => 
        Array.from(row.cells.values()).map(cell => 
            cell.value ? cell.value.toString().trim() : ''
        )
    );
}

function extractHeaderValues(headers) {
    return headers.map(header => 
        header.value ? header.value.toString().trim() : ''
    );
}

// Константы
const CONSTANTS = {
    MAX_TABLE_DIMENSION: 6,
    DEFAULT_SEARCH_LIMIT: 20,
    SUPPORTED_TYPES: ['table', 'text']
};

module.exports = router;


           


