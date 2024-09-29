const express = require('express');
const router = express.Router();
const db = require('../db'); // Your database connection

router.get('/search', async (req, res) => {
    const { skill, radius, lat, lon } = req.query;

    const usersQuery = `
        SELECT user_id, username, email, profile_photo, latitude, longitude 
        FROM users 
        WHERE user_id <> ? AND user_id IN (
            SELECT user_id FROM user_skills us 
            JOIN skills s ON us.skill_id = s.skill_id 
            WHERE s.skill_name LIKE ?
        )
    `;

    try {
        const [users] = await db.query(usersQuery, [req.user.user_id, `%${skill}%`]);

        // Haversine distance calculation function
        const haversineDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Radius of the Earth in km
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
        };

        const filteredUsers = users.filter(user => {
            const distance = haversineDistance(lat, lon, user.latitude, user.longitude);
            return distance <= radius;
        });

        res.json(filteredUsers);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
