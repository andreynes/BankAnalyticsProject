"use strict";

class AutoTagger {
    /**
     * Анализирует входной объект и генерирует массив тегов.
     * Ожидается, что входной объект имеет структуру:
     * {
     *   rows: [
     *     { label: "Выручка", values: [100, 200, 300] },
     *     { label: "EBITDA", values: [50, 60, 80] },
     *     { label: "Прибыль", values: [5, 9, 8] }
     *   ]
     * }
     *
     * Если значение row.label содержит одно из ключевых слов ("выручка", "ebitda" или "прибыль")
     * (без учета регистра и пробелов), то в результирующий массив добавляется тег "формат:деньги".
     *
     * Для отладки вы можете раскомментировать строки с console.log, чтобы увидеть входные данные.
     *
     * @param {Object} input - объект с разобранными данными из ExcelProcessor.
     * @returns {Array} - массив тегов, например, [ "формат:деньги" ]
     */
    analyzeTags(input) {
        // Для отладки: 
        // console.log("AutoTagger input:", JSON.stringify(input, null, 2));
        const tags = [];
        if (input && Array.isArray(input.rows)) {
            input.rows.forEach(row => {
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
        }
        return tags;
    }
}

module.exports = AutoTagger;

