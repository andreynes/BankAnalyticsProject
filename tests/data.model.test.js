const mongoose = require('mongoose');
const { expect } = require('chai');
const Data = require('../models/Data');

describe('Data Model Test', () => {
    const validData = {
        fileName: 'test.xlsx',
        data: [{
            row: new Map([
                ['Column1', 'Value1'],
                ['Column2', 'Value2']
            ]),
            rowNumber: 1
        }],
        tags: ['test', 'excel'],
        metadata: {
            sheetName: 'Sheet1',
            totalRows: 1,
            totalColumns: 2,
            columnTypes: new Map([
                ['Column1', 'text'],
                ['Column2', 'text']
            ]),
            statistics: {
                emptyValues: 0,
                numericalColumns: [],
                categoricalColumns: ['Column1', 'Column2']
            },
            tagging: {
                categories: {
                    business: ['test'],
                    technical: [],
                    content: ['excel'],
                    other: []
                },
                autoTags: ['test'],
                manualTags: ['excel']
            }
        }
    };

    before(function(done) {
        // Увеличиваем таймаут до 10 секунд
        this.timeout(10000);
        
        // Подключаемся к базе данных
        mongoose.disconnect().then(() => {
            mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            })
            .then(() => done())
            .catch(err => done(err));
        }).catch(err => done(err));
    });

    beforeEach(function(done) {
        this.timeout(5000);
        Data.deleteMany({})
            .then(() => done())
            .catch(err => done(err));
    });

    it('should validate valid data', function(done) {
        this.timeout(5000);
        const data = new Data(validData);
        data.save()
            .then(savedData => {
                expect(savedData._id).to.exist;
                expect(savedData.fileName).to.equal('test.xlsx');
                done();
            })
            .catch(err => done(err));
    });

    it('should require fileName', function(done) {
        this.timeout(5000);
        const dataWithoutFileName = { ...validData };
        delete dataWithoutFileName.fileName;
        
        const data = new Data(dataWithoutFileName);
        data.save()
            .then(() => {
                done(new Error('Should have thrown validation error'));
            })
            .catch(error => {
                expect(error.errors.fileName).to.exist;
                done();
            });
    });

    it('should set default status to pending', function() {
        const data = new Data(validData);
        expect(data.status).to.equal('pending');
    });

    it('should convert tags to lowercase', function(done) {
        this.timeout(5000);
        const data = new Data({
            ...validData,
            tags: ['TEST', 'Excel', 'IMPORT']
        });
        data.save()
            .then(() => {
                expect(data.tags).to.include('test');
                expect(data.tags).to.include('excel');
                expect(data.tags).to.include('import');
                done();
            })
            .catch(err => done(err));
    });

    it('should handle tag management methods', function(done) {
        this.timeout(5000);
        const data = new Data(validData);
        data.save()
            .then(() => {
                data.addTag('newTag');
                return data.save();
            })
            .then(() => {
                expect(data.tags).to.include('newtag');
                data.removeTag('newtag');
                return data.save();
            })
            .then(() => {
                expect(data.tags).to.not.include('newtag');
                done();
            })
            .catch(err => done(err));
    });

    it('should find documents by tag', function(done) {
        this.timeout(5000);
        Promise.all([
            Data.create({ ...validData, tags: ['tag1', 'common'] }),
            Data.create({ ...validData, tags: ['tag2', 'common'] }),
            Data.create({ ...validData, tags: ['tag3'] })
        ])
        .then(() => Data.findByTag('common'))
        .then(results => {
            expect(results).to.have.lengthOf(2);
            done();
        })
        .catch(err => done(err));
    });

    it('should find documents by date range', function(done) {
        this.timeout(5000);
        const now = new Date();
        const yesterday = new Date(now - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now + 24 * 60 * 60 * 1000);

        Promise.all([
            Data.create({ ...validData, uploadDate: yesterday }),
            Data.create({ ...validData, uploadDate: tomorrow })
        ])
        .then(() => Data.findByDateRange(yesterday, tomorrow))
        .then(results => {
            expect(results).to.have.lengthOf(2);
            done();
        })
        .catch(err => done(err));
    });

    it('should calculate document age correctly', function(done) {
        this.timeout(5000);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const data = new Data({
            ...validData,
            uploadDate: twoDaysAgo
        });
        data.save()
            .then(() => {
                expect(data.age).to.be.approximately(2, 1);
                done();
            })
            .catch(err => done(err));
    });

    it('should handle processing errors', function(done) {
        this.timeout(5000);
        const data = new Data({
            ...validData,
            status: 'failed',
            processingErrors: [{
                code: 'ERR001',
                message: 'Test error'
            }]
        });
        data.save()
            .then(() => {
                expect(data.processingErrors).to.have.lengthOf(1);
                expect(data.processingErrors[0].code).to.equal('ERR001');
                done();
            })
            .catch(err => done(err));
    });

    it('should update lastModified on save', function(done) {
        this.timeout(5000);
        let firstModified;
        const data = new Data(validData);
        data.save()
            .then(() => {
                firstModified = data.lastModified;
                return new Promise(resolve => setTimeout(resolve, 1000));
            })
            .then(() => {
                data.fileName = 'updated.xlsx';
                return data.save();
            })
            .then(() => {
                expect(data.lastModified.getTime()).to.be.greaterThan(firstModified.getTime());
                done();
            })
            .catch(err => done(err));
    });

    after(function(done) {
        this.timeout(10000);
        mongoose.disconnect()
            .then(() => done())
            .catch(err => done(err));
    });
});
