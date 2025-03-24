const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const path = require('path');
const fs = require('fs');
const { app, connectDB } = require('../server');
const mongoose = require('mongoose');
const Data = require('../models/Data');

chai.use(chaiHttp);

describe('File Upload API', function() {
    this.timeout(10000);

    const testDir = path.join(__dirname, 'test-files');
    const testFilePath = path.join(testDir, 'test-upload.xlsx');

    before(async function() {
        // Подключаемся к базе данных
        await connectDB();

        // Создаем тестовую директорию
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Создаем тестовый Excel файл
        const xlsx = require('xlsx');
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата', 'Клиент', 'Сумма', 'Количество', 'Статус'],
            ['2024-03-21', 'ООО "Тест"', '1500000.50', '5', 'срочно'],
            ['2024-03-22', 'ИП Иванов', '-2000.75', '', 'отложено']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);

        // Очищаем коллекцию перед тестами
        await Data.deleteMany({});
    });

    beforeEach(async function() {
        // Очищаем коллекцию перед каждым тестом
        await Data.deleteMany({});
    });

    it('should upload an Excel file successfully', function(done) {
        chai.request(app)
            .post('/upload')
            .attach('file', testFilePath)
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body.success).to.be.true;
                expect(res.body.fileId).to.exist;
                expect(res.body.metadata).to.exist;
                done();
            });
    });

    it('should reject request without file', function(done) {
        chai.request(app)
            .post('/upload')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.success).to.be.false;
                expect(res.body.error).to.exist;
                done();
            });
    });

    it('should reject invalid file types', function(done) {
        // Создаем временный текстовый файл
        const invalidFilePath = path.join(testDir, 'invalid.txt');
        fs.writeFileSync(invalidFilePath, 'This is not an Excel file');

        chai.request(app)
            .post('/upload')
            .attach('file', invalidFilePath)
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.success).to.be.false;
                expect(res.body.error).to.exist;

                // Удаляем временный файл
                fs.unlinkSync(invalidFilePath);
                done();
            });
    });

    it('should process file and save tags', function(done) {
        chai.request(app)
            .post('/upload')
            .attach('file', testFilePath)
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body.tags).to.be.an('array');
                
                // Проверяем сохранение в базе данных
                Data.findById(res.body.fileId)
                    .then(data => {
                        expect(data).to.exist;
                        expect(data.tags).to.be.an('array');
                        expect(data.metadata.tagging).to.exist;
                        done();
                    })
                    .catch(err => done(err));
            });
    });

    it('should handle large files appropriately', function(done) {
        // Создаем большой Excel файл
        const xlsx = require('xlsx');
        const wb = xlsx.utils.book_new();
        const wsData = Array(1000).fill().map((_, i) => [
            `2024-03-${String(i % 30 + 1).padStart(2, '0')}`,
            `Client ${i}`,
            Math.random() * 10000,
            Math.floor(Math.random() * 100),
            ['новый', 'в работе', 'завершен'][i % 3]
        ]);
        wsData.unshift(['Дата', 'Клиент', 'Сумма', 'Количество', 'Статус']);
        
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Large Sheet');
        
        const largeFilePath = path.join(testDir, 'large-test.xlsx');
        xlsx.writeFile(wb, largeFilePath);

        chai.request(app)
            .post('/upload')
            .attach('file', largeFilePath)
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body.success).to.be.true;

                // Удаляем большой файл
                fs.unlinkSync(largeFilePath);
                done();
            });
    });

    after(async function() {
        // Удаляем тестовые файлы
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        // Очищаем тестовую директорию
        if (fs.existsSync(testDir)) {
            const files = fs.readdirSync(testDir);
            for (const file of files) {
                fs.unlinkSync(path.join(testDir, file));
            }
            fs.rmdirSync(testDir);
        }

        // Очищаем базу данных и отключаемся
        await Data.deleteMany({});
        await mongoose.disconnect();
    });
});
