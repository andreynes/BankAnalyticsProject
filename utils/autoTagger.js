"use strict";

class AutoTagger {
  /**
   * Анализирует входной объект и генерирует базовые теги.
   *
   * Ожидаемый формат входа:
   * {
   *   rows: [
   *     { label: "Выручка", values: [ ... ] },
   *     { label: "EBITDA", values: [ ... ] },
   *     { label: "Прибыль", values: [ ... ] },
   *     ...
   *   ]
   * }
   *
   * Если значение row.label содержит один из ключевых терминов:
   * "выручка", "прибыль", "ebitda", "маржа"
   * добавляется тег "формат:деньги".
   *
   * @param {Object} input - данные для анализа
   * @returns {Array} - массив тегов, например, [ "формат:деньги" ]
   */
  analyzeTags(input) {
    const tags = [];
    if (input && Array.isArray(input.rows)) {
      input.rows.forEach(row => {
        if (row.label && typeof row.label === "string") {
          const trimmedLabel = row.label.trim().toLowerCase();
          if (
            trimmedLabel.includes("выручка") ||
            trimmedLabel.includes("прибыль") ||
            trimmedLabel.includes("ebitda") ||
            trimmedLabel.includes("маржа")
          ) {
            if (!tags.includes("формат:деньги")) {
              tags.push("формат:деньги");
            }
          }
        }
      });
    }
    return tags;
  }
}

module.exports = AutoTagger;


