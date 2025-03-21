const mongoose = require('mongoose');
const { expect } = require('chai');
require('dotenv').config();

describe('Database Connection', () => {
    it('should connect to MongoDB', async function() {
        this.timeout(10000); // увеличиваем таймаут до 10 секунд
        try {
            await mongoose.disconnect(); // Сначала отключаемся, если уже подключены
            await mongoose.connect(process.env.MONGODB_URI);
            expect(mongoose.connection.readyState).to.equal(1);
        } catch (err) {
            throw err;
        }
    });

    after(async function() {
        this.timeout(10000);
        await mongoose.connection.close();
    });
});