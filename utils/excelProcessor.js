const XLSX = require('xlsx');
const path = require('path');

class ExcelProcessor {
    constructor() {
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
                    totalRows: 0,
                    totalColumns: 0,
                    processedAt: new Date()
                },
                tags: []
            };

            // Обрабатываем каждый лист
            for (const sheetName of workbook.SheetNames) {
                console.log('Processing sheet:', sheetName);
                const sheet = workbook.Sheets[sheetName];
                const sheetData = this.processSheet(sheet);

                // Добавляем данные листа
                result.data.push({
                    sheetName: sheetName,
                    content: sheetData.content,
                    headers: sheetData.headers,
                    rows: sheetData.rows
                });

                // Обновляем метаданные
                result.metadata.totalRows += sheetData.rowCount;
                result.metadata.totalColumns = Math.max(
                    result.metadata.totalColumns,
                    sheetData.columnCount
                );

                // Добавляем теги
                result.tags = [...new Set([...result.tags, ...this.generateTags(sheetData)])];
            }

            return result;

        } catch (error) {
            console.error('Error processing Excel file:', error);
            throw new Error(`Failed to process Excel file: ${error.message}`);
        }
    }

    processSheet(sheet) {
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const data = XLSX.utils.sheet_to_json(sheet, { 
            header: 1, 
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: ''  // значение по умолчанию для пустых ячеек
        });
        
        // Анализируем структуру заголовков
        const headerStructure = this.analyzeHeaderStructure(data);
        
        return {
            content: data,
            headers: headerStructure.headers,
            rows: this.processRows(data.slice(headerStructure.headerRows)),
            rowCount: data.length,
            columnCount: headerStructure.headers.length,
            metadata: {
                headerLevels: headerStructure.headerLevels,
                hasMultiLevelHeaders: headerStructure.headerLevels > 1
            }
        };
    }

    analyzeHeaderStructure(data) {
        let headerRows = 1;
        let headers = [];
        let headerLevels = 1;

        // Определяем количество строк заголовков
        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (this.isHeaderRow(row)) {
                headerRows++;
            } else {
                break;
            }
        }

        // Обрабатываем многоуровневые заголовки
        if (headerRows > 1) {
            headers = this.processMultiLevelHeaders(data.slice(0, headerRows));
            headerLevels = headerRows;
        } else {
            headers = data[0].map(this.processCell.bind(this));
        }

        return {
            headers,
            headerRows,
            headerLevels
        };
    }

    isHeaderRow(row) {
        // Эвристика для определения строки заголовка
        if (!row || row.length === 0) return false;

        const nonEmptyCells = row.filter(cell => cell !== '');
        if (nonEmptyCells.length === 0) return false;

        // Проверяем характеристики, типичные для заголовков
        const characteristics = nonEmptyCells.map(cell => ({
            isAllCaps: typeof cell === 'string' && cell === cell.toUpperCase(),
            hasSpecialFormat: this.hasSpecialCharacters(cell),
            length: String(cell).length
        }));

        // Подсчитываем характеристики
        const stats = characteristics.reduce((acc, char) => {
            acc.allCapsCount += char.isAllCaps ? 1 : 0;
            acc.specialFormatCount += char.hasSpecialFormat ? 1 : 0;
            acc.averageLength += char.length;
            return acc;
        }, { allCapsCount: 0, specialFormatCount: 0, averageLength: 0 });

        stats.averageLength /= characteristics.length;

        // Определяем, является ли строка заголовком на основе характеристик
        return (
            stats.allCapsCount / characteristics.length > 0.5 ||
            stats.averageLength < 30 ||
            stats.specialFormatCount / characteristics.length < 0.3
        );
    }

    processMultiLevelHeaders(headerRows) {
        const headers = [];
        const maxLevel = headerRows.length;

        for (let col = 0; col < headerRows[0].length; col++) {
            const header = {
                value: '',
                levels: [],
                metadata: {}
            };

            for (let level = 0; level < maxLevel; level++) {
                const value = headerRows[level][col];
                if (value !== '') {
                    header.levels.push({
                        value: value,
                        level: level + 1,
                        metadata: this.extractCellMetadata(value)
                    });
                }
            }

            // Устанавливаем основное значение заголовка
            header.value = header.levels[header.levels.length - 1].value;
            header.metadata = this.extractCellMetadata(header.value);
            headers.push(header);
        }

        return headers;
    }

    processRows(rows) {
        return rows.map(row => row.map(cell => this.processCell(cell)));
    }

    processCell(cellValue) {
        const type = this.determineCellType(cellValue);
        const metadata = this.extractCellMetadata(cellValue);

        return {
            value: this.formatCellValue(cellValue, type),
            type: type,
            metadata: metadata
        };
    }

    formatCellValue(value, type) {
        switch (type) {
            case 'date':
                return this.formatDate(value);
            case 'number':
                return this.formatNumber(value);
            case 'string':
                return String(value).trim();
            default:
                return value;
        }
    }

    formatDate(value) {
        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }
        const date = new Date(value);
        return !isNaN(date) ? date.toISOString().split('T')[0] : value;
    }

    formatNumber(value) {
        const num = Number(value);
        return !isNaN(num) ? num : value;
    }

    determineCellType(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }
        if (typeof value === 'number') {
            return 'number';
        }
        if (value instanceof Date) {
            return 'date';
        }
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (typeof value === 'string') {
            if (value.startsWith('=')) {
                return 'formula';
            }
            // Проверка на дату
            if (!isNaN(Date.parse(value))) {
                return 'date';
            }
            // Проверка на число в строковом формате
            if (!isNaN(value) && value.trim() !== '') {
                return 'number';
            }
        }
        return 'string';
    }

    extractCellMetadata(value) {
        return {
            format: this.determineCellFormat(value),
            precision: this.determineNumericPrecision(value),
            hasSpecialChars: this.hasSpecialCharacters(value),
            length: value ? String(value).length : 0,
            isMultiline: typeof value === 'string' && value.includes('\n'),
            hasFormula: typeof value === 'string' && value.startsWith('=')
        };
    }

    determineCellFormat(value) {
        if (value instanceof Date) {
            return this.determineDateFormat(value);
        }
        if (typeof value === 'number') {
            return this.determineNumberFormat(value);
        }
        return 'general';
    }

    determineNumberFormat(value) {
        if (Number.isInteger(value)) {
            return 'integer';
        }
        // Проверяем, является ли число процентом
        if (typeof value === 'string' && value.includes('%')) {
            return 'percentage';
        }
        // Проверяем, является ли число денежным значением
        if (typeof value === 'string' && /^[₽$€£¥]/.test(value)) {
            return 'currency';
        }
        return 'decimal';
    }

    determineDateFormat(value) {
        const dateStr = value instanceof Date ? value.toISOString() : String(value);
        
        const formats = {
          'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
          'DD.MM.YYYY': /^\d{2}\.\d{2}\.\d{4}$/,
          'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
          'YYYY.MM.DD': /^\d{4}\.\d{2}\.\d{2}$/,
          'ISO': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      };

      for (const [format, regex] of Object.entries(formats)) {
          if (regex.test(dateStr)) {
              return format;
          }
      }
      return 'unknown';
  }

  determineNumericPrecision(value) {
      if (typeof value === 'number') {
          const str = value.toString();
          const decimalIndex = str.indexOf('.');
          return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
      }
      if (typeof value === 'string' && !isNaN(value)) {
          const decimalIndex = value.indexOf('.');
          return decimalIndex === -1 ? 0 : value.length - decimalIndex - 1;
      }
      return null;
  }

  hasSpecialCharacters(value) {
      if (typeof value !== 'string') return false;
      return /[^a-zA-Z0-9\s]/.test(value);
  }

  generateTags(sheetData) {
      const tags = new Set();

      // Добавляем теги из заголовков
      sheetData.headers.forEach(header => {
          if (header.value) {
              // Добавляем основное значение заголовка
              tags.add(header.value.toLowerCase());
              
              // Добавляем значения из многоуровневых заголовков
              if (header.levels) {
                  header.levels.forEach(level => {
                      tags.add(level.value.toLowerCase());
                  });
              }
          }
      });

      // Анализируем данные для дополнительных тегов
      sheetData.rows.forEach(row => {
          row.forEach(cell => {
              if (cell.type === 'string' && cell.value) {
                  // Добавляем ключевые слова как теги
                  const keywords = this.extractKeywords(cell.value);
                  keywords.forEach(keyword => tags.add(keyword.toLowerCase()));
              }
          });
      });

      return Array.from(tags);
  }

  extractKeywords(text) {
      if (typeof text !== 'string') return [];

      // Список стоп-слов (можно расширить)
      const stopWords = new Set(['и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему']);

      // Разбиваем текст на слова и фильтруем
      return text
          .split(/[\s,\.!?;:]+/) // Разделяем по знакам препинания и пробелам
          .filter(word => {
              word = word.toLowerCase();
              return word.length > 2 && // Игнорируем короткие слова
                  !stopWords.has(word) && // Игнорируем стоп-слова
                  !/^\d+$/.test(word); // Игнорируем числа
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

          if (!Array.isArray(sheet.content)) {
              throw new Error(`Invalid content structure in sheet ${sheet.sheetName}`);
          }

          // Проверка заголовков
          if (!Array.isArray(sheet.headers)) {
              throw new Error(`Invalid headers structure in sheet ${sheet.sheetName}`);
          }

          // Проверка строк данных
          if (!Array.isArray(sheet.rows)) {
              throw new Error(`Invalid rows structure in sheet ${sheet.sheetName}`);
          }

          // Проверка согласованности данных
          const headerLength = sheet.headers.length;
          for (const row of sheet.rows) {
              if (!Array.isArray(row) || row.length !== headerLength) {
                  throw new Error(`Inconsistent row length in sheet ${sheet.sheetName}`);
              }
          }
      }

      return true;
  }

  cleanup() {
      // Метод для очистки временных файлов или ресурсов
      console.log('Cleaning up resources...');
  }
}

module.exports = ExcelProcessor;





