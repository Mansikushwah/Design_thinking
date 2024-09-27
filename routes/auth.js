const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

// Login Page
router.get('/login', (req, res) => res.render('login', { page: 'login' }));

// Register Page
router.get('/register', (req, res) => {
    res.render('register', { page: 'login' }); // Render the register page
});

router.post('/register', (req, res) => {
    const { username, email, password, city, locality } = req.body; // Extract city and locality
    console.log("hello");

    // Hash the password before storing it
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Server error');
        }

        // Include city and locality in the user creation process
        User.create({ username, email, password: hash, city, locality }, (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Server error');
            }
            res.redirect('/login');
        });
    });
});


// Login Handle
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

module.exports = router;