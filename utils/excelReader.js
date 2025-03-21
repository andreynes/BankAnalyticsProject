const xlsx = require('xlsx');
const path = require('path');

class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.workbook = null;
    }

    /**
     * Загрузка Excel файла
     */
    load() {
        try {
            this.workbook = xlsx.readFile(this.filePath);
            return true;
        } catch (error) {
            throw new Error(`Ошибка при чтении файла: ${error.message}`);
        }
    }

    /**
     * Получение списка листов
     */
    getSheetNames() {
        if (!this.workbook) {
            throw new Error('Файл не загружен');
        }
        return this.workbook.SheetNames;
    }

    /**
     * Чтение данных с конкретного листа
     * @param {string} sheetName - имя листа
     * @param {boolean} includeHeaders - включать ли заголовки
     */
    readSheet(sheetName, includeHeaders = true) {
        if (!this.workbook) {
            throw new Error('Файл не загружен');
        }

        const worksheet = this.workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null // значение по умолчанию для пустых ячеек
        });

        if (!includeHeaders && data.length > 0) {
            data.shift(); // Удаляем первую строку (заголовки)
        }

        return {
            sheetName,
            totalRows: data.length,
            totalColumns: data[0]?.length || 0,
            headers: includeHeaders && data.length > 0 ? data[0] : [],
            rows: data.map((row, index) => ({
                rowNumber: index + 1,
                data: row
            }))
        };
    }

    /**
     * Анализ содержимого файла
     */
    analyzeContent() {
        if (!this.workbook) {
            throw new Error('Файл не загружен');
        }

        const analysis = {
            fileName: path.basename(this.filePath),
            sheets: [],
            totalSheets: this.workbook.SheetNames.length
        };

        for (const sheetName of this.workbook.SheetNames) {
            const sheetData = this.readSheet(sheetName);
            analysis.sheets.push({
                name: sheetName,
                rowCount: sheetData.totalRows,
                columnCount: sheetData.totalColumns,
                headers: sheetData.headers
            });
        }

        return analysis;
    }

    /**
     * Очистка ресурсов
     */
    cleanup() {
        this.workbook = null;
    }
}

module.exports = ExcelReader;