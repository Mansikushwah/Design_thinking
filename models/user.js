const db = require('../config/database');

const User = {
    // Create a new user with latitude and longitude
    create: (userData, callback) => {
        const { username, email, password, city, locality, latitude, longitude } = userData;
        const sql = 'INSERT INTO users (username, email, password, city, locality, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [username, email, password, city, locality, latitude, longitude], callback);
    },

    // Find a user by their email address
    findByEmail: (email, callback) => {
        const sql = 'SELECT * FROM users WHERE email = ?';
        db.query(sql, [email], callback);
    },

    // Find a user by their ID (using `user_id` instead of `id`)
    findById: (id, callback) => {
        const sql = 'SELECT * FROM users WHERE user_id = ?';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err, null);
            return callback(null, results[0]); // Return the first matching user
        });
    },

    // Other user-related methods can be added here
};

module.exports = User;
