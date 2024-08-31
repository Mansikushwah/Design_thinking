const express = require('express');
const router = express.Router();

// Route for the About Us page
router.get('/about', (req, res) => {
    console.log('About Us route accessed');  // Debug log
    const teamMembers = [
        { name: 'Alice', role: 'Founder', image: '/images/photo.jpeg' },
        { name: 'Bob', role: 'CTO', image: '/images/photo.jpeg' }
    ];
    res.render('about', { teamMembers, user: req.user });
});

module.exports = router;
