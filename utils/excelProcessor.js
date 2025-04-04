const XLSX = require('xlsx');
const path = require('path');
const BaseDataProcessor = require('./baseDataProcessor');

class ExcelProcessor extends BaseDataProcessor {
    constructor(options = {}) {
        super(options);
        this.supportedTypes = new Set(['string', 'number', 'date', 'boolean', 'formula', 'error', 'empty']);
    }

    async processFile(filePath) {
        try {
            console.log('Processing file:', filePath);
            const workbook = XLSX.readFile(filePath);
            
            const result = {
                data: [],
                metadata: {
                    sheetNames: workbook.SheetNames,
                    totalBlocks: 0,
                    totalRows: 0,
                    processedAt: new Date()
                },
                tags: []
            };

            // Обрабатываем каждый лист
            for (const sheetName of workbook.SheetNames) {
                console.log('Processing sheet:', sheetName);
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet, { 
                    header: 1,
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    defval: ''
                });

                // Анализируем и создаем блоки
                const blocks = this.analyzeAndCreateBlocks(data);
                
                // Добавляем данные листа
                result.data.push({
                    sheetName: sheetName,
                    blocks: blocks
                });

                // Обновляем метаданные
                result.metadata.totalBlocks += blocks.length;
                result.metadata.totalRows += data.length;

                // Собираем теги со всех блоков
                const sheetTags = blocks.reduce((tags, block) => [...tags, ...block.tags], []);
                result.tags = [...new Set([...result.tags, ...sheetTags])];
            }

            return result;

        } catch (error) {
            console.error('Error processing Excel file:', error);
            throw new Error(`Failed to process Excel file: ${error.message}`);
        }
    }

    analyzeAndCreateBlocks(data) {
        const blocks = [];
        let currentBlock = null;
        let isInTable = false;
        let tableHeaders = null;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Пропускаем пустые строки
            if (this.isEmptyRow(row)) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                    isInTable = false;
                    tableHeaders = null;
                }
                continue;
            }

            const isTableRow = this.isTableRow(row);

            // Если тип контента изменился или это первая строка
            if (isTableRow !== isInTable || !currentBlock) {
                // Сохраняем предыдущий блок
                if (currentBlock) {
                    blocks.push(currentBlock);
                }

                // Создаем новый блок
                currentBlock = this.createDataBlock(
                    isTableRow ? 'table' : 'text',
                    {
                        text: isTableRow ? null : '',
                        headers: isTableRow ? [] : null,
                        rows: isTableRow ? [] : null
                    },
                    [] // начальные теги
                );

                isInTable = isTableRow;
                tableHeaders = null;
            }

            // Добавляем данные в текущий блок
            if (isTableRow) {
                if (!tableHeaders) {
                    // Первая строка таблицы - заголовки
                    tableHeaders = this.processHeaders(row);
                    currentBlock.content.headers = tableHeaders;
                } else {
                    // Добавляем строку данных
                    const processedRow = this.processRow(row, tableHeaders);
                    currentBlock.content.rows = currentBlock.content.rows || [];
                    currentBlock.content.rows.push(processedRow);
                }
            } else {
                // Добавляем текстовое содержимое
                const textContent = row.filter(cell => cell !== '').join(' ').trim();
                if (textContent) {
                    currentBlock.content.text += (currentBlock.content.text ? '\n' : '') + textContent;
                }
            }

            // Добавляем теги на основе содержимого
            const rowTags = this.extractTagsFromRow(row);
            currentBlock.tags = [...new Set([...currentBlock.tags, ...rowTags])];
        }

        // Добавляем последний блок
        if (currentBlock) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    isTableRow(row) {
        if (!row || row.length === 0) return false;

        const nonEmptyCells = row.filter(cell => cell !== '');
        if (nonEmptyCells.length < 2) return false;

        // Проверяем характеристики табличной строки
        const numericCells = row.filter(cell => 
            ['number', 'currency', 'percentage'].includes(this.determineCellType(cell))
        );

        const structuredCells = row.filter(cell => 
            this.hasStructuredFormat(cell)
        );

        return (
            nonEmptyCells.length > 2 && // Минимум 3 непустые ячейки
            (numericCells.length > 0 || // Содержит числовые данные
            structuredCells.length > 0)  // Или имеет структурированный формат
        );
    }

    hasStructuredFormat(cell) {
        if (typeof cell !== 'string') return false;
        
        // Проверяем различные форматы структурированных данных
        const patterns = [
            /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/, // Даты
            /^[A-Z0-9]{2,}[-_][A-Z0-9]{2,}$/,    // Коды
            /^[\d.,]+\s*[%₽$€£¥]$/,               // Форматированные числа
            /^\d+\.\d+\.\d+$/                     // Иерархические номера
        ];

        return patterns.some(pattern => pattern.test(cell));
    }

    isEmptyRow(row) {
        return !row || row.length === 0 || row.every(cell => cell === '');
    }

    processHeaders(row) {
        return row.map((cell, index) => ({
            value: cell,
            index: index,
            type: this.determineCellType(cell),
            metadata: this.extractCellMetadata(cell)
        }));
    }

    processRow(row, headers) {
        const processedRow = {
            cells: {},
            metadata: {
                rowNumber: row.rowNumber || 0,
                isEmpty: this.isEmptyRow(row)
            }
        };

        headers.forEach((header, index) => {
            const value = row[index] || '';
            processedRow.cells[header.index] = {
                value: this.formatCellValue(value, this.determineCellType(value)),
                type: this.determineCellType(value),
                metadata: this.extractCellMetadata(value)
            };
        });

        return processedRow;
    }

    extractTagsFromRow(row) {
        const tags = new Set();

        row.forEach(cell => {
            if (!cell) return;

            // Извлекаем ключевые слова из текстовых ячеек
            if (typeof cell === 'string') {
                const keywords = this.extractKeywords(cell);
                keywords.forEach(keyword => tags.add(keyword.toLowerCase()));
            }

            // Добавляем теги на основе типа данных
            const cellType = this.determineCellType(cell);
            if (cellType !== 'text' && cellType !== 'empty') {
                tags.add(cellType);
            }
        });

        return Array.from(tags);
    }

    extractKeywords(text) {
        if (typeof text !== 'string') return [];

        // Список стоп-слов
        const stopWords = new Set(['и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему']);

        return text
            .split(/[\s,\.!?;:]+/)
            .filter(word => {
                word = word.toLowerCase();
                return word.length > 2 &&
                    !stopWords.has(word) &&
                    !/^\d+$/.test(word);
            });
    }

    async validateData(data) {
        // Проверка структуры данных
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        // Проверка каждого листа
        for (const sheet of data) {
            if (!sheet.sheetName) {
                throw new Error('Sheet name is required');
            }

            if (!Array.isArray(sheet.blocks)) {
                throw new Error(`Invalid blocks structure in sheet ${sheet.sheetName}`);
            }

            // Проверка каждого блока
            for (const block of sheet.blocks) {
                if (!block.type || !['table', 'text'].includes(block.type)) {
                    throw new Error(`Invalid block type in sheet ${sheet.sheetName}`);
                }

                if (block.type === 'table' && (!block.content.headers || !block.content.rows)) {
                    throw new Error(`Invalid table structure in sheet ${sheet.sheetName}`);
                }
            }
        }

        return true;
    }

    cleanup() {
        console.log('Cleaning up resources...');
    }
}

module.exports = ExcelProcessor;


