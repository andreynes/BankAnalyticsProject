"use strict";

const AutoTagger = require('./utils/autoTagger');

const testInput = {
  rows: [
    { label: "Выручка", values: [100, 200, 300] },
    { label: "EBITDA", values: [50, 60, 80] },
    { label: "Прибыль", values: [5, 9, 8] },
    { label: "Прочее", values: ["текст"] }
  ]
};

const autoTagger = new AutoTagger();
const tags = autoTagger.analyzeTags(testInput);
console.log("AutoTagger result:", JSON.stringify(tags, null, 2));


