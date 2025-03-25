"use strict";

const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const ExcelProcessor = require("../utils/excelProcessor");

describe("ExcelProcessor Tests", () => {
    const testDir = path.join(__dirname, "test-files");
    const testFilePath = path.join(testDir, "excelProcessorTest.xlsx");

    before(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        // Создаем тестовый Excel-файл с матричным форматом.
        // Формат:
        // Row1 (заголовки): [ "Дата операции", "Клиент", "Сумма продажи", "Количество", "Статус" ]
        // Row2: [ "2024-03-21", "ООО \"Тест\"", "1000.50", "5", "Тестовая запись" ]
        // Row3: [ "2024-03-22", "ИП Иванов", "2000.75", "", "" ]
        // Row4: [ "", "", "0", "10", "Специальные символы: !@#$%" ]
        const wsData = [
            ["Дата операции", "Клиент", "Сумма продажи", "Количество", "Статус"],
            ["2024-03-21", "ООО \"Тест\"", "1000.50", "5", "Тестовая запись"],
            ["2024-03-22", "ИП Иванов", "2000.75", "", ""],
            ["", "", "0", "10", "Специальные символы: !@#$%"]
        ];
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        xlsx.writeFile(wb, testFilePath);
    });

    it("should return an object with correct structure", async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        expect(result).to.be.an("object");
        expect(result).to.have.property("vertical", false);
        expect(result).to.have.property("headers").that.is.an("array");
        expect(result).to.have.property("data").that.is.an("array");
        expect(result).to.have.property("metadata").that.is.an("object");
        expect(result.metadata).to.have.property("columnTypes");
        expect(result).to.have.property("sheetName").that.is.a("string");
        expect(result).to.have.property("totalRows").that.is.a("number");
        expect(result).to.have.property("totalColumns").that.is.a("number");
    });

    it("should correctly parse header values", async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        // Заголовки должны соответствовать:
        // ["Дата операции", "Клиент", "Сумма продажи", "Количество", "Статус"]
        expect(result.headers).to.deep.equal([
            "Дата операции",
            "Клиент",
            "Сумма продажи",
            "Количество",
            "Статус"
        ]);
    });

    it("should correctly process data row values", async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        // Первый data row (соответствует второй строке Excel)
        const firstRow = result.data[0];
        expect(firstRow.row.get("Дата операции")).to.equal("2024-03-21");
        expect(firstRow.row.get("Клиент")).to.equal('ООО "Тест"');
        expect(firstRow.row.get("Сумма продажи")).to.equal(1000.5);
        expect(firstRow.row.get("Количество")).to.equal(5);
        expect(firstRow.row.get("Статус")).to.equal("Тестовая запись");
    });

    it("should handle missing values correctly", async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        // Второй data row (третья строка Excel) содержит пустые значения в "Количество" и "Статус"
        const secondRow = result.data[1];
        expect(secondRow.row.get("Дата операции")).to.equal("2024-03-22");
        expect(secondRow.row.get("Клиент")).to.equal("ИП Иванов");
        expect(secondRow.row.get("Сумма продажи")).to.equal(2000.75);
        expect(secondRow.row.get("Количество")).to.equal("");
        expect(secondRow.row.get("Статус")).to.equal("");
    });

    it("should handle special characters correctly", async () => {
        const result = await ExcelProcessor.processFile(testFilePath);
        // Третий data row (четвертая строка Excel)
        const thirdRow = result.data[2];
        expect(thirdRow.row.get("Дата операции")).to.equal("");
        expect(thirdRow.row.get("Клиент")).to.equal("");
        expect(thirdRow.row.get("Сумма продажи")).to.equal(0);
        expect(thirdRow.row.get("Количество")).to.equal(10);
        expect(thirdRow.row.get("Статус")).to.equal("Специальные символы: !@#$%");
    });

    after(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });
});

