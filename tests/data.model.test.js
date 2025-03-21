const mongoose = require('mongoose');
const { expect } = require('chai');
const Data = require('../models/Data');

describe('Data Model Test', () => {
    // Тестовые данные
    const validData = {
        fileName: 'test.xlsx',
        data: [{
            row: new Map([['A1', 'test value']]),
            rowNumber: 1
        }],
        tags: ['test', 'excel'],
        metadata: {
            sheetName: 'Sheet1',
            totalRows: 1,
            totalColumns: 1
        }
    };

    it('should validate valid data', () => {
        const data = new Data(validData);
        const err = data.validateSync();
        expect(err).to.be.undefined;
    });

    it('should require fileName', () => {
        const dataWithoutFileName = { ...validData };
        delete dataWithoutFileName.fileName;
        const data = new Data(dataWithoutFileName);
        const err = data.validateSync();
        expect(err.errors.fileName).to.exist;
    });

    it('should set default status to pending', () => {
        const data = new Data(validData);
        expect(data.status).to.equal('pending');
    });

    it('should convert tags to lowercase', () => {
        const dataWithUppercaseTags = {
            ...validData,
            tags: ['TEST', 'Excel']
        };
        const data = new Data(dataWithUppercaseTags);
        expect(data.tags[0]).to.equal('test');
        expect(data.tags[1]).to.equal('excel');
    });
});