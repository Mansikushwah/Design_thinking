const connection = require('./path-to-your-db-connection-file'); // Import the database connection

// Fetch user profile by post_id
function getUserProfileByPost(req, res) {
    const post_id = req.params.post_id;  // Extract the post_id from the request parameters
    const query = `
        SELECT u.user_id, u.username, u.email, u.profile_photo, u.availability, u.rating, u.created_at 
        FROM users u
        JOIN posts p ON u.user_id = p.user_id
        WHERE p.post_id = ?;
    `;
    
    connection.query(query, [post_id], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).send({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: 'User not found for this post' });
        }

        res.json(results[0]);  // Send the first (and only) result back as JSON
    });
}

// Fetch user profile by showcase_id
function getUserProfileByShowcase(req, res) {
    const showcase_id = req.params.showcase_id;  // Extract the showcase_id from the request parameters
    const query = `
        SELECT u.user_id, u.username, u.email, u.profile_photo, u.availability, u.rating, u.created_at 
        FROM users u
        JOIN showcases s ON u.user_id = s.user_id
        WHERE s.showcase_id = ?;
    `;
    
    connection.query(query, [showcase_id], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).send({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: 'User not found for this showcase' });
        }

        res.json(results[0]);  // Send the first (and only) result back as JSON
    });
}

// Export the functions
module.exports = {
    getUserProfileByPost,
    getUserProfileByShowcase
};

router.get('/anotherProfile', (req, res) => {
    const user = req.user; 
        // Fetch skills for this user
        db.query('SELECT s.skill_id, s.skill_name FROM skills s JOIN user_skills us ON s.skill_id = us.skill_id WHERE us.user_id = ?', [user.user_id], (err, skillResults) => {
            if (err) throw err;
        
            const skills = skillResults;
        
            // Query to get showcases for the user
            db.query('SELECT showcase_id, title, description, image_url, created_at FROM showcases WHERE user_id = ?', [user.user_id], (err, showcaseResults) => {
                if (err) throw err;
        
                const showcases = showcaseResults;
                db.query('SELECT post_id, title, content, created_at FROM posts WHERE user_id = ?', [user.user_id], (err, postResults) => {
                    if (err) throw err;
            
                    const posts = postResults;
            
                    // Render profile page with user, skills, and showcases data
                    res.render('profile', { user, skills, showcases, posts, page: 'profile'});
                });
            });
        });
});
