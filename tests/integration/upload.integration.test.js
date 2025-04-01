// tests/integration/upload.integration.test.js

const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const app = require('../../server');
const { createExcelTestFile } = require('../utils/createTestFiles');
const { connectDB, disconnectDB } = require('../../config/db');

describe('File Upload Integration Test', () => {
    const testFilePath = path.join(__dirname, '../test-files/test.xlsx');
    const uploadDir = path.join(__dirname, '../../uploads');

    before(async () => {
        await connectDB();
        
        // Создаем директорию для загрузок, если её нет
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Создаем тестовый файл с известными данными
        await createExcelTestFile(testFilePath, {
            headers: ['Date', 'Revenue', 'Profit'],
            data: [
                ['2023-01-01', 1000, 500],
                ['2023-02-01', 2000, 1000],
                ['2023-03-01', 3000, 1500]
            ],
            metadata: {
                title: 'Test Financial Report',
                author: 'Test User',
                company: 'Test Company'
            }
        });
    });

    after(async () => {
        // Очистка тестовых файлов
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        // Очистка директории загрузок
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
            fs.unlinkSync(path.join(uploadDir, file));
        }

        await disconnectDB();
    });

    it('should upload file and save with correct tags', async () => {
        const response = await request(app)
            .post('/api/upload')
            .attach('file', testFilePath);

        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('tags').that.is.an('array');
        expect(response.body.tags).to.include('2023');
        expect(response.body.tags).to.include('revenue');
        expect(response.body.tags).to.include('profit');
        expect(response.body).to.have.nested.property('metadata.fileInfo');
        expect(response.body.metadata.fileInfo).to.have.property('fileSize').that.is.a('number');
    });

    it('should handle large files correctly', async () => {
        const largePath = path.join(__dirname, '../test-files/large.xlsx');
        await createExcelTestFile(largePath, {
            headers: ['Data'],
            data: Array(1000).fill(['Large file test']),
            size: 'large'
        });

        const response = await request(app)
            .post('/api/upload')
            .attach('file', largePath);

        expect(response.status).to.equal(413);
        
        if (fs.existsSync(largePath)) {
            fs.unlinkSync(largePath);
        }
    });

    it('should reject invalid file types', async () => {
        const invalidPath = path.join(__dirname, '../test-files/invalid.txt');
        fs.writeFileSync(invalidPath, 'Invalid file content');

        const response = await request(app)
            .post('/api/upload')
            .attach('file', invalidPath);

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error').that.includes('Invalid file type');

        fs.unlinkSync(invalidPath);
    });

    it('should handle missing file', async () => {
        const response = await request(app)
            .post('/api/upload')
            .send({});

        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error').that.includes('No file uploaded');
    });

    it('should process complex data structure correctly', async () => {
        const complexPath = path.join(__dirname, '../test-files/complex.xlsx');
        await createExcelTestFile(complexPath, {
            headers: ['Category', 'Subcategory', 'Value'],
            data: [
                ['Revenue', 'Sales', 1000],
                ['Revenue', 'Services', 2000],
                ['Costs', 'Direct', 500],
                ['Costs', 'Indirect', 300]
            ],
            metadata: {
                title: 'Complex Report',
                author: 'Test User'
            }
        });

        const response = await request(app)
            .post('/api/upload')
            .attach('file', complexPath);

        expect(response.status).to.equal(200);
        expect(response.body).to.have.nested.property('blocks[0].content.headers');
        expect(response.body.blocks[0].content.headers).to.have.length(3);

        fs.unlinkSync(complexPath);
    });

    it('should generate appropriate tags', async () => {
        const response = await request(app)
            .post('/api/upload')
            .attach('file', testFilePath);

        expect(response.status).to.equal(200);
        expect(response.body.tags).to.include('revenue');
        expect(response.body.tags).to.include('profit');
        expect(response.body.tags).to.include('2023');
        expect(response.body.tags).to.be.an('array').that.is.not.empty;
    });

    it('should handle concurrent uploads', async () => {
        const promises = Array(2).fill(null).map(() => 
            request(app)
                .post('/api/upload')
                .attach('file', testFilePath)
        );

        const responses = await Promise.all(promises);
        responses.forEach(response => {
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('tags');
            expect(response.body.metadata).to.have.property('fileInfo');
        });
    });

    it('should handle file size limits', async () => {
        const largePath = path.join(__dirname, '../test-files/too-large.xlsx');
        const size = 17 * 1024 * 1024; // 17MB
        
        // Создаем файл больше лимита
        const fd = fs.openSync(largePath, 'w');
        fs.writeSync(fd, Buffer.alloc(size));
        fs.closeSync(fd);

        const response = await request(app)
            .post('/api/upload')
            .attach('file', largePath);

        expect(response.status).to.equal(413);
        
        fs.unlinkSync(largePath);
    });

    it('should preserve file metadata', async () => {
        const response = await request(app)
            .post('/api/upload')
            .attach('file', testFilePath);

        expect(response.status).to.equal(200);
        expect(response.body.metadata).to.have.property('fileInfo');
        expect(response.body.metadata.fileInfo).to.have.property('fileSize');
        expect(response.body.metadata.fileInfo).to.have.property('fileName');
        expect(response.body.metadata.fileInfo).to.have.property('mimeType');
        expect(response.body.metadata.fileInfo).to.have.property('uploadDate');
        expect(response.body.metadata.statistics).to.have.property('processedAt');
    });
});


