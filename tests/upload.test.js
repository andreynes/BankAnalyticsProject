const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const path = require('path');
const fs = require('fs');
const { app, connectDB } = require('../server');
const mongoose = require('mongoose');
const xlsx = require('xlsx');

chai.use(chaiHttp);

describe('File Upload API', () => {
    const testFilePath = path.join(__dirname, 'test-files', 'test.xlsx');

    before(async function() {
        this.timeout(10000);
        // Подключаемся к базе данных перед тестами
        await connectDB();

        // Создаем директорию для тестовых файлов
        const testDir = path.join(__dirname, 'test-files');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Создаем тестовый Excel файл
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([['Test', 'Data'], [1, 2]]);
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        xlsx.writeFile(wb, testFilePath);
    });

    it('should upload an Excel file successfully', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/upload')
            .attach('file', testFilePath)
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('message');
                done();
            });
    });

    it('should reject request without file', function(done) {
        this.timeout(5000);
        chai.request(app)
            .post('/upload')
            .end((err, res) => {
                if (err) return done(err);
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('error');
                done();
            });
    });

    after(async function() {
        this.timeout(10000);
        // Удаляем тестовый файл
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        // Закрываем соединение с базой данных
        await mongoose.connection.close();
    });
});