const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { user: req.user });
});
router.get('/search_people', (req, res) => {
    res.render('search_people');
});
router.get('/post', (req, res) => {
    res.render('post');
});
router.get('/profile', (req, res) => {
    res.render('profile');
});
router.get('/search', (req, res) => {
    res.render('search');
});

module.exports = router;