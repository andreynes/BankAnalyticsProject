const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

router.get('/', async (req, res) => {
    try {
        const query = req.query.q.toLowerCase();
        console.log('Search query:', query);

        // Расширенные критерии поиска
        const searchCriteria = {
            $or: [
                { companyName: { $regex: query, $options: 'i' } },
                { 'data.indicator': { $regex: query, $options: 'i' } },
                { tags: { $regex: query, $options: 'i' } }
            ]
        };

        console.log('Search criteria:', JSON.stringify(searchCriteria, null, 2));

        const data = await Data.find(searchCriteria);
        console.log('Found documents:', data.length);

        if (!data || data.length === 0) {
            return res.status(404).json({ 
                error: 'Data not found',
                query: query,
                searchCriteria: searchCriteria
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: error.message,
            query: req.query.q 
        });
    }
});

module.exports = router;

