"use strict";

const TagAssigner = require('./utils/tagAssigner');

const testData = {
  sheetData: [
    ["Компания", "Дата1", "Дата2"],
    ["TestCompany", "1000.5", "2000,75"],
    ["", "", ""],
    ["Прибыль", "1500", "-500"]
  ],
  metadata: {}
};

const tagAssigner = new TagAssigner();
const result = tagAssigner.assignTags(testData);

console.log("TagAssigner result:", JSON.stringify(result, null, 2));


