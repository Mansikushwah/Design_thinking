const express = require('express');
const router = express.Router();

// Route for the About Us page
module.exports = router;
router.get('/about', (req, res) => {
    console.log('About Us route accessed');  // Debug log
    const teamMembers = [
        { name: 'Mansi', role: 'Founder', image: '/images/photo.jpeg' },
        { name: 'Kritika', role: 'co-Founder', image: '/images/photo.jpeg' }
    ];
    res.render('about', { teamMembers, user: req.user, page: 'about'});
});
