"use strict";

class AutoTagger {
  /**
   * Анализирует входной объект и генерирует массив тегов.
   *
   * Ожидается, что входной объект имеет либо свойство "rows", либо "data".
   *
   * Если используется "data", то предполагается, что это массив объектов вида:
   * { row: [ [header, value], ... ], ... }
   * Мы используем либо row.label, если оно существует, либо первую ячейку (значение второй части первой пары).
   *
   * Если значение label содержит одно из ключевых слов ("выручка", "ebitda" или "прибыль")
   * (без учета регистра и пробелов), то добавляется тег "формат:деньги".
   *
   * @param {Object} input - объект с разобранными данными.
   * @returns {Array} - массив тегов, например, [ "формат:деньги" ]
   */
  analyzeTags(input) {
    const tags = [];
    let rows = [];

    if (input) {
      // Если есть свойство rows, используем его
      if (Array.isArray(input.rows)) {
        rows = input.rows;
      } else if (Array.isArray(input.data)) {
        // Если нет "rows", но есть "data", преобразуем данные:
        rows = input.data.map(rowObj => {
          let label = "";
          if (rowObj.label && typeof rowObj.label === "string") {
            label = rowObj.label;
          } else if (rowObj.row && Array.isArray(rowObj.row) && rowObj.row.length > 0) {
            // Если нет явного label, используем значение первой ячейки (второй элемент пары)
            label = rowObj.row[0][1];
          }
          return { label };
        });
      }
    }

    rows.forEach(row => {
      if (row.label && typeof row.label === "string") {
        const trimmedLabel = row.label.trim().toLowerCase();
        if (
          trimmedLabel.includes("выручка") ||
          trimmedLabel.includes("ebitda") ||
          trimmedLabel.includes("прибыль")
        ) {
          if (!tags.includes("формат:деньги")) {
            tags.push("формат:деньги");
          }
        }
      }
    });
    return tags;
  }
}

module.exports = AutoTagger;

