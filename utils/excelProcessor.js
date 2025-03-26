'use strict';

const xlsx = require('xlsx');
const fs = require('fs');

class ExcelProcessor {
  /**
   * Обрабатывает Excel‑файл и возвращает данные в виде массива строк.
   * Формат возвращаемого объекта:
   * {
   *   vertical: false,
   *   headers: [ ... ],         // массив заголовков
   *   data: [                   // массив строк (каждая строка – массив значений)
   *     [ cell1, cell2, ... ],
   *     ...
   *   ],
   *   metadata: {
   *     columnTypes: Map { ... },
   *     statistics: {}
   *   },
   *   sheetName: <имя листа>,
   *   totalRows: <число строк>,
   *   totalColumns: <число столбцов>
   * }
   * Если данные заданы вертикально (единственный столбец), применяется другая логика.
   *
   * @param {string} filePath - Путь к Excel‑файлу.
   * @param {Object} [options] - Дополнительные опции (не используются здесь).
   * @returns {Object} - Разобранные данные.
   */
  static async processFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error("Файл не найден: " + filePath);
    }

    // Читаем книгу с опцией cellDates: true для корректной обработки дат
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Получаем данные как массив массивов (каждая строка – массив ячеек)
    let rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log("rawData:", JSON.stringify(rawData, null, 2));

    // Если первая строка состоит из одного значения, равного имени листа, удаляем её
    if (rawData.length > 0 && rawData[0].length === 1 && rawData[0][0] === sheetName) {
      rawData.shift();
    }

    // Определяем максимальное число столбцов во всех строках и дополняем каждую строку пустыми строками
    const maxColumns = rawData.reduce((max, row) => Math.max(max, row.length), 0);
    rawData = rawData.map(row => {
      while (row.length < maxColumns) {
        row.push("");
      }
      return row;
    });

    // Если число строк больше, чем число столбцов, возможно данные повернуты – транспонируем
    if (rawData.length > rawData[0].length) {
      rawData = ExcelProcessor.transpose(rawData);
      console.log("После транспонирования, rawData:", JSON.stringify(rawData, null, 2));
    }

    // Стандартный формат: минимум 2 строки и больше одного столбца
    if (rawData.length >= 2 && rawData[0].length > 1) {
      // Заголовки – первая строка (обрезаем пробелы)
      const headers = rawData[0].map(h => h.toString().trim());

      // Определяем типы столбцов на основе заголовков
      const columnTypes = new Map();
      headers.forEach(header => {
        const lc = header.toLowerCase();
        if (lc.includes("дата")) {
          columnTypes.set(header, "date");
        } else if (lc.includes("сумма") || lc.includes("количество")) {
          columnTypes.set(header, "number");
        } else {
          columnTypes.set(header, "text");
        }
      });

      // Остальные строки – данные
      const data = rawData.slice(1);

      return {
        vertical: false,
        headers: headers,
        data: data,
        metadata: {
          columnTypes: columnTypes,
          statistics: {}
        },
        sheetName: sheetName,
        totalRows: rawData.length,
        totalColumns: headers.length
      };
    } else if (rawData.length > 0 && rawData[0].length === 1) {
      // Логика для вертикального формата (один столбец)
      const values = rawData.map(row => row[0]);
      const data = [];
      // Примерная логика: первые 3 значения – даты, затем группы по 4 значения
      for (let i = 3; i < values.length; i += 4) {
        const label = values[i];
        const rowValues = values.slice(i + 1, i + 4).map(val => {
          const num = parseFloat(val.toString().replace(',', '.'));
          return isNaN(num) ? val : num;
        });
        data.push([label, ...rowValues]);
      }
      return {
        vertical: true,
        headers: [],
        data: data,
        metadata: {
          statistics: {}
        },
        sheetName: sheetName,
        totalRows: rawData.length,
        totalColumns: 1
      };
    } else {
      throw new Error("Неподдерживаемый формат Excel-файла");
    }
  }

  /**
   * Транспонирует матрицу (массив массивов).
   * @param {Array} matrix - Исходная матрица.
   * @returns {Array} - Транспонированная матрица.
   */
  static transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }
}

module.exports = ExcelProcessor;

