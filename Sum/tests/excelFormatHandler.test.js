const { expect } = require('chai');
const ExcelFormatHandler = require('../utils/excelFormatHandler');

describe('ExcelFormatHandler', () => {
    describe('Date Handling', () => {
        it('should handle Excel date numbers', () => {
            const excelDate = 44987; // 2023-03-21
            expect(ExcelFormatHandler.handleDate(excelDate)).to.match(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should handle date strings', () => {
            expect(ExcelFormatHandler.handleDate('2023-03-21')).to.equal('2023-03-21');
        });

        it('should handle invalid dates', () => {
            expect(ExcelFormatHandler.handleDate('not a date')).to.equal('not a date');
        });
    });

    describe('Number Handling', () => {
        it('should format numbers with two decimal places', () => {
            expect(ExcelFormatHandler.handleNumber(1000.5)).to.equal('1000.50');
        });

        it('should handle string numbers with comma', () => {
            expect(ExcelFormatHandler.handleNumber('1000,50')).to.equal('1000.50');
        });

        it('should handle invalid numbers', () => {
            expect(ExcelFormatHandler.handleNumber('not a number')).to.equal('not a number');
        });
    });

    describe('Text Handling', () => {
        it('should trim text values', () => {
            expect(ExcelFormatHandler.handleText('  test  ')).to.equal('test');
        });

        it('should handle null and undefined', () => {
            expect(ExcelFormatHandler.handleText(null)).to.equal('');
            expect(ExcelFormatHandler.handleText(undefined)).to.equal('');
        });
    });

    describe('Column Type Detection', () => {
        it('should detect date columns', () => {
            const values = ['2023-03-21', '2023-03-22', 'invalid', '2023-03-23'];
            expect(ExcelFormatHandler.detectColumnType(values)).to.equal('date');
        });

        it('should detect number columns', () => {
            const values = ['1000.50', '2000', 'invalid', '3000.75'];
            expect(ExcelFormatHandler.detectColumnType(values)).to.equal('number');
        });
    });
});