"use strict";

const xlsx = require('xlsx');
const fs = require('fs');

class ExcelProcessor {
  /**
   * Обрабатывает Excel‑файл и возвращает данные в виде объектов-строк.
   * Формат возвращаемого объекта:
   * {
   *   vertical: false,
   *   headers: [ ... ],         // массив заголовков
   *   data: [                   // массив объектов-строк
   *     {
   *       rowNumber: <номер строки>,
   *       label: <значение первой ячейки>,
   *       row: Map { <header> => <value>, ... }
   *     },
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
   */
  static async processFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error("Файл не найден: " + filePath);
    }
    
    // Читаем книгу с опцией cellDates: true для корректного отображения дат
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
    
    // Определяем максимальное число столбцов и дополняем каждую строку пустыми строками
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
    
    // Проверка на стандартный формат: минимум 2 строки и >1 столбец
    if (rawData.length >= 2 && rawData[0].length > 1) {
      // Заголовки – первая строка
      const headers = rawData[0].map(h => h.toString().trim());
      
      // Определяем типы столбцов по заголовкам
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
      
      // Обрабатываем каждую последующую строку, создавая объект-строку с Map
      const data = [];
      for (let i = 1; i < rawData.length; i++) {
        const rowArray = rawData[i];
        if (!rowArray || rowArray.length === 0) continue;
        
        // Берем первую ячейку как label
        let label = rowArray[0];
        if (typeof label === "string") {
          label = label.trim();
        } else {
          label = label.toString().trim();
        }
        if (label === "") continue; // пропускаем строку, если label пустой
        
        const rowMap = new Map();
        for (let j = 0; j < headers.length; j++) {
          let cell = rowArray[j] === undefined ? "" : rowArray[j];
          if (cell instanceof Date) {
            cell = cell.toLocaleDateString();
          } else if (typeof cell === "string") {
            cell = cell.trim();
          } else {
            cell = cell.toString().trim();
          }
          if (columnTypes.get(headers[j]) === "number" && cell !== "") {
            let s = cell;
            if (s.includes(",") && s.includes(".")) {
              s = s.replace(/,/g, '');
            } else {
              s = s.replace(',', '.');
            }
            const num = parseFloat(s);
            cell = isNaN(num) ? cell : num;
          }
          rowMap.set(headers[j], cell);
        }
        data.push({ rowNumber: i, label, row: rowMap });
      }
      
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
      // Вертикальный формат (один столбец)
      const values = rawData.map(row => row[0]);
      const data = [];
      for (let i = 3; i < values.length; i += 4) {
        const label = values[i];
        const rowValues = values.slice(i + 1, i + 4).map(val => {
          const num = parseFloat(val.toString().replace(',', '.'));
          return isNaN(num) ? val : num;
        });
        const rowMap = new Map();
        rowMap.set(label, rowValues);
        data.push({ rowNumber: i, label, row: rowMap });
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


