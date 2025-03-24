const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Data = require('../../models/Data');

chai.use(chaiHttp);
const { app } = require('../../server');

describe('File Upload Integration Test', function() {
    this.timeout(10000);

    const testDir = path.join(__dirname, '..', 'test-files');
    const testFilePath = path.join(testDir, 'test-upload.xlsx');

    before(async function() {
        try {
            // Отключаемся от предыдущего соединения, если оно есть
            await mongoose.disconnect();
        } catch (err) {
            console.log('Disconnect error:', err);
        }

        // Подключаемся к тестовой базе данных
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Создаем тестовую директорию
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Создаем тестовый Excel файл
        const wb = xlsx.utils.book_new();
        const wsData = [
            ['Дата', 'Клиент', 'Сумма продажи', 'Количество', 'Статус'],
            ['2024-03-21', 'ООО "Тест"', '1500000.50', '5', 'срочно'],
            ['2024-03-22', 'ИП Иванов', '-2000.75', '', 'отложено'],
            ['2024-03-23', 'ООО "Специальные знаки (%@#)"', '750.25', '10', 'в работе']
        ];
        const ws = xlsx.utils.aoa_to_sheet(wsData);
        xlsx.utils.book_append_sheet(wb, ws, 'Тестовый лист');
        xlsx.writeFile(wb, testFilePath);

        // Очищаем коллекцию перед тестами
        await Data.deleteMany({});
    });

    beforeEach(async function() {
        // Очищаем коллекцию перед каждым тестом
        await Data.deleteMany({});
    });

    it('should upload file and save with correct tags', async function() {
        const res = await chai.request(app)
            .post('/upload')
            .attach('file', testFilePath);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.fileId).to.exist;
        expect(res.body.tags).to.be.an('array');
        
        const data = await Data.findById(res.body.fileId);
        expect(data).to.exist;
        expect(data.fileName).to.include('test-upload.xlsx');
        expect(data.status).to.equal('processed');
        
        const tags = data.tags.map(tag => tag.toLowerCase());
        expect(tags).to.include('крупная_сумма');
        expect(tags).to.include('отрицательное_значение');
        expect(tags).to.include('юридическое_лицо');
        
        expect(data.metadata).to.exist;
        expect(data.metadata.totalRows).to.be.a('number');
        expect(data.metadata.totalColumns).to.equal(5);
        
        expect(data.metadata.tagging).to.exist;
        expect(data.metadata.tagging.categories).to.exist;
        expect(data.metadata.tagging.categories.business).to.be.an('array');
    });

    it('should handle file with special characters', async function() {
        const res = await chai.request(app)
            .post('/upload')
            .attach('file', testFilePath);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        
        const data = await Data.findById(res.body.fileId);
        expect(data).to.exist;
        expect(data.data).to.be.an('array');
        
        const hasSpecialChars = data.data.some(row => {
            const clientValue = row.row.get('Клиент');
            return clientValue && clientValue.includes('(%@#)');
        });
        expect(hasSpecialChars).to.be.true;
    });

    it('should save statistics correctly', async function() {
        const res = await chai.request(app)
            .post('/upload')
            .attach('file', testFilePath);
    
        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        
        const data = await Data.findById(res.body.fileId);
        expect(data.metadata.statistics).to.exist;
        expect(data.metadata.statistics.emptyValues).to.be.a('number');
        expect(data.metadata.statistics.numericalColumns).to.be.an('array');
        expect(data.metadata.statistics.categoricalColumns).to.be.an('array');
        
        // Проверяем, что определенные колонки существуют в соответствующих категориях
        const numericalColumns = data.metadata.statistics.numericalColumns;
        const categoricalColumns = data.metadata.statistics.categoricalColumns;
    
        // Проверяем числовые колонки
        expect(numericalColumns).to.include('Сумма продажи');
        expect(numericalColumns).to.include('Количество');
    
        // Проверяем текстовые колонки
        expect(categoricalColumns).to.include('Клиент');
        expect(categoricalColumns).to.include('Статус');
    
        // Проверяем, что колонка даты обрабатывается как текст
        expect(categoricalColumns).to.include('Дата');
    });
    

    it('should handle upload errors correctly', async function() {
        // Создаем некорректный файл
        const invalidFilePath = path.join(testDir, 'invalid.txt');
        fs.writeFileSync(invalidFilePath, 'Not an Excel file');

        try {
            const res = await chai.request(app)
                .post('/upload')
                .attach('file', invalidFilePath);

            expect(res).to.have.status(400);
            expect(res.body.success).to.be.false;
            expect(res.body.error).to.exist;
            expect(res.body.errorId).to.exist;

            // Даем небольшую паузу для сохранения ошибки в базу
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Проверяем сохранение ошибки в базе
            const errorData = await Data.findById(res.body.errorId);
            expect(errorData, 'Error data should exist in database').to.exist;
            expect(errorData.status).to.equal('failed');
            expect(errorData.processingErrors).to.be.an('array');
            expect(errorData.processingErrors).to.have.lengthOf.at.least(1);
            expect(errorData.processingErrors[0]).to.have.property('code');
            expect(errorData.processingErrors[0]).to.have.property('message');

        } finally {
            // Очистка
            if (fs.existsSync(invalidFilePath)) {
                fs.unlinkSync(invalidFilePath);
            }
        }
    });

    it('should handle missing file', async function() {
        const res = await chai.request(app)
            .post('/upload')
            .send({}); // Отправляем пустой запрос

        expect(res).to.have.status(400);
        expect(res.body.success).to.be.false;
        expect(res.body.error).to.exist;
        expect(res.body.errorId).to.exist;

        const errorData = await Data.findById(res.body.errorId);
        expect(errorData).to.exist;
        expect(errorData.status).to.equal('failed');
        expect(errorData.processingErrors[0].code).to.equal('NO_FILE');
    });

    after(async function() {
        try {
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

            // Очищаем базу данных
            await Data.deleteMany({});

            // Отключаемся от базы данных
            await mongoose.disconnect();
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    });
});




