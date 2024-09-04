const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { user: req.user });
});
router.get('/search_people', (req, res) => {
    res.render('search_people');
});
router.get('/search', (req, res) => {
    res.render('search');
});

module.exports = router;
