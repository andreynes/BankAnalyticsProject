const express = require('express');
const router = express.Router();
const Data = require('../models/Data');


router.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        console.log('Search query:', query);


        // Разбиваем запрос на части
        const terms = query.toLowerCase().split(' ');
        
        // Создаем базовый критерий поиска по компании
        const searchCriteria = {
            companyName: { $regex: terms[0], $options: 'i' }
        };


        // Если есть второе слово (показатель)
        if (terms[1]) {
            searchCriteria.$and = [
                { indicators: { $regex: terms[1], $options: 'i' } },
                { 'data.indicator': { $regex: terms[1], $options: 'i' } }
            ];
        }


        console.log('Search criteria:', JSON.stringify(searchCriteria, null, 2));


        const documents = await Data.find(searchCriteria);
        console.log('Found documents:', documents.length);


        res.json(documents);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});


module.exports = router;



