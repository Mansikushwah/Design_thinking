const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');  // Add multer for handling file uploads
const path = require('path');
const db = require('../config/database');
const fs = require('fs');
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));
router.use('/uploads', express.static('uploads'));

// Configure storage for multer
const storage = multer.diskStorage({
    destination: './uploads/',  // Directory where files will be saved
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));  // Create a unique filename
    }
});

const upload = multer({ storage: storage });  // Initialize multer with the storage configuration

router.use(bodyParser.urlencoded({ extended: true }));

// Render the 'index' page
router.get('/', (req, res) => {
        res.render('index', { user: req.user, page: 'home' });
    
});

// Render the 'search_people' page
router.get('/search_people', (req, res) => {
    const sql = `
        SELECT u.username, u.email, u.profile_photo AS profile_photo, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        GROUP BY u.user_id, u.username, u.email, u.profile_photo`;

    db.query(sql, [], (err, results) => {
        if (err) {
            console.error('Error fetching people:', err);
            return res.status(500).send('Server error');
        }

        // Render the EJS template with the initial people data
        res.render('search_people', { user: req.user, people: results });
    });
});

// AJAX route for fetching filtered people based on skill
router.get('/people/search', (req, res) => {
    const searchQuery = req.query.skill || ''; // Get the search query from the request

    const sql = `
        SELECT u.username, u.email, u.profile_photo AS profile_photo, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name LIKE ?
        GROUP BY u.user_id, u.username, u.email, u.profile_photo`;

    db.query(sql, [`%${searchQuery}%`], (err, results) => {
        if (err) {
            console.error('Error fetching people:', err);
            return res.status(500).send('Server error');
        }

        // Build the HTML to send back to the client
        let html = '';
        if (results.length > 0) {
            results.forEach(person => {
                html += `
                    <div class="person-card">
                        <img src="${person.profile_photo_url || '/images/default_profile_photo.jpg'}" alt="${person.username}">
                        <h3>${person.username}</h3>
                        <p>Skills: ${person.skills}</p>
                        <p>Email: ${person.email}</p>
                    </div>`;
            });
        } else {
            html = '<p>No people found with that skill.</p>';
        }

        res.send(html); // Send the generated HTML back to the client
    });
});


// Render the 'add_showcase' page
router.get('/add_showcase', (req, res) => {
    res.render('add_showcase',{ user: req.user });
});

router.post('/upload_profile_photo', upload.single('profile_photo'), (req, res) => {
    const userId = req.user.user_id; // Assuming user is authenticated and user data is available
    console.log(req.file);
    const photoPath = path.join('/uploads', req.file.filename);
    
    // Update user profile photo in the database
    db.query('UPDATE users SET profile_photo = ? WHERE user_id = ?', [photoPath, userId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating profile photo');
        }
        res.redirect('/profile'); // Redirect to profile page after update
    });
});

router.post('/update_profile', (req, res) => {
    const { username, availability } = req.body;
    console.log("newwa");
    if (!username || !availability) {
        return res.status(400).json({ success: false, message: 'Username and availability cannot be null' });
    }

    const sql = 'UPDATE users SET username = ?, availability = ? WHERE user_id = ?';
    db.query(sql, [username, availability, req.user.user_id], (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ success: false, message: 'Database update failed' });
        }
        res.json({ success: true });
    });
});
router.post('/delete_showcase', (req, res) => {
    const { showcaseId } = req.body;
    const userId = req.user.user_id; // Assume this is obtained from your authentication middleware

    // Fetch the current showcase image path from the database
    const fetchShowcaseSql = 'SELECT image_url FROM showcases WHERE showcase_id = ? AND user_id = ?';
    db.query(fetchShowcaseSql, [showcaseId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching showcase image:', err);
            return res.json({ success: false, message: 'Failed to fetch showcase image' });
        }

        const imagePath = results[0]?.image_url;
        if (imagePath) {
            fs.unlink(path.join(__dirname, '..', imagePath), (err) => {
                if (err) {
                    console.error('Error deleting the showcase image:', err);
                    return res.json({ success: false, message: 'Failed to delete showcase image' });
                }
            });
            const updateImageUrlSql = 'UPDATE showcases SET image_url = NULL WHERE showcase_id = ?';
                db.query(updateImageUrlSql, [showcaseId], (err) => {
                    if (err) {
                        console.error('Error setting image URL to NULL:', err);
                        return res.status(500).json({ success: false, message: 'Error setting image URL to NULL.' });
                    }
         });
        }

        // Delete the image from the file system
        

            // Delete from showcase_skills table first
            const deleteSkillsSql = 'DELETE FROM showcase_skills WHERE showcase_id = ?';
            db.query(deleteSkillsSql, [showcaseId], (err) => {
                if (err) {
                    console.error('Error deleting showcase skills:', err);
                    return res.status(500).json({ success: false, message: 'Error deleting showcase skills.' });
                }

                // Then delete the showcase record
                const deleteShowcaseSql = 'DELETE FROM showcases WHERE showcase_id = ?';
                db.query(deleteShowcaseSql, [showcaseId], (err, result) => {
                    if (err) {
                        console.error('Error deleting showcase record:', err);
                        return res.status(500).json({ success: false, message: 'Error deleting showcase record.' });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ success: false, message: 'Showcase not found.' });
                    }

                    res.json({ success: true, message: 'Showcase and image deleted successfully.' });
                });
            });
        });
    });

router.post('/delete_profile_photo', (req, res) => {
    const userId = req.user.user_id; // Assume this is obtained from your authentication middleware

    // Fetch the current profile photo path from the database
    const fetchPhotoSql = 'SELECT profile_photo FROM users WHERE user_id = ?';
    db.query(fetchPhotoSql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching profile photo:', err);
            return res.json({ success: false, message: 'Failed to fetch profile photo' });
        }

        const photoPath = results[0]?.profile_photo;
        if (!photoPath) {
            return res.json({ success: false, message: 'No profile photo found to delete' });
        }

        // Delete the photo from the file system
        fs.unlink(path.join(__dirname, '..', photoPath), (err) => {
            if (err) {
                console.error('Error deleting the photo:', err);
                return res.json({ success: false, message: 'Failed to delete photo' });
            }

            // Update the database to set profile photo to NULL or a default value
            const updatePhotoSql = 'UPDATE users SET profile_photo = NULL WHERE user_id = ?';
            db.query(updatePhotoSql, [userId], (err) => {
                if (err) {
                    console.error('Error updating database after deleting photo:', err);
                    return res.json({ success: false, message: 'Failed to update database after deleting photo' });
                }

                res.json({ success: true, message: 'Profile photo deleted successfully' });
            });
        });
    });
});


// Render the 'post' page
router.get('/post', (req, res) => {
    const searchTerm = req.query.q || ''; // Get the search term from query

    // SQL query to fetch posts with optional search filter
    const query = `
        SELECT 
    posts.post_id,
    posts.title, 
    posts.content, 
    posts.created_at, 
    users.username AS poster, 
    users.profile_photo, 
    GROUP_CONCAT(DISTINCT skills.skill_name) AS skills
FROM 
    posts
JOIN 
    users ON posts.user_id = users.user_id
LEFT JOIN 
    post_skills ON posts.post_id = post_skills.post_id
LEFT JOIN 
    skills ON post_skills.skill_id = skills.skill_id
WHERE 
    posts.title LIKE ? OR skills.skill_name LIKE ?
GROUP BY 
    posts.post_id, 
    posts.title, 
    posts.content, 
    posts.created_at, 
    users.username, 
    users.profile_photo
ORDER BY 
    posts.created_at DESC;

    `;

    db.query(query, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).send('Server error');
        }

        // Render the 'post' view with posts and searchTerm
        res.render('post', { posts: results, searchTerm: searchTerm, user: req.user });
    });
});

// Render the 'profile' page
router.get('/profile', (req, res) => {
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

router.post('/add_showcase', upload.single('image'), (req, res) => {
    const { title, description, skills } = req.body;
    const userId = req.user.user_id; 
    const imagePath = path.join('/uploads', req.file.filename);

    const sql = 'INSERT INTO showcases (user_id, title, description, image_url) VALUES (?, ?, ?, ?)';
    db.query(sql, [userId, title, description, imagePath], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false });
        }

        const showcaseId = results.insertId;

        // Insert skills associated with the showcase
        if (skills.length > 0) {
            const skillSql = 'INSERT INTO showcase_skills (showcase_id, skill_id) VALUES ?';
            const skillValues = JSON.parse(skills).map(skill => [showcaseId, skill]);

            db.query(skillSql, [skillValues], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false });
                }

                res.json({ success: true, showcase: { title, description, image_url: `/uploads/${imagePath}` } });
            });
        } else {
            res.json({ success: true, showcase: { title, description, image_url: `/uploads/${imagePath}` } });
        }
    });
});
router.get('/skills', (req, res) => {
    db.query('SELECT * FROM skills', (err, results) => {
        if (err) throw err;
        res.json({ skills: results });
    });
});
router.post('/update_skills', (req, res) => {
    const userId = req.user.user_id; // Get the user ID from session or authentication
    const { selectedSkills } = req.body;
        // Insert the new selected skills
        const values = selectedSkills.map(skillId => [userId, skillId]);

        db.query('INSERT INTO user_skills (user_id, skill_id) VALUES ?', [values], (err) => {
            if (err) throw err;
            res.json({ success: true });
        });
    });
router.post('/remove_skill', (req, res) => {
    const userId = req.user.user_id; // Get the user ID from session or authentication
    const { skillId } = req.body;

    db.query('DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?', [userId, skillId], (err) => {
        if (err) throw err;
        res.json({ success: true });
    });
});
router.post('/add_post', (req, res) => {
    const { title, content, skills } = req.body;
    const userId = req.user.user_id; // Assume this is obtained from your authentication middleware

    // Insert the new post into the database
    const sql = 'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)';
    db.query(sql, [userId, title, content], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Error adding post.' });
        }

        const postId = results.insertId;

        // Insert skills associated with the post
        if (skills.length > 0) {
            const skillSql = 'INSERT INTO post_skills (post_id, skill_id) VALUES ?';
            const skillValues = JSON.parse(skills).map(skill => [postId, skill]);

            db.query(skillSql, [skillValues], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Error associating skills with post.' });
                }

                res.json({ success: true, post: { title, content, skills } });
            });
        } else {
            res.json({ success: true, post: { title, content, skills: [] } });
        }
    });
});
router.post('/delete_post', (req, res) => {
    const { postId } = req.body;
    const userId = req.user.user_id; // Assume this is obtained from your authentication middleware

    // Delete associated skills first
    const deleteSkillsSql = 'DELETE FROM post_skills WHERE post_id = ?';
    db.query(deleteSkillsSql, [postId], (err) => {
        if (err) {
            console.error('Error deleting post skills:', err);
            return res.status(500).json({ success: false, message: 'Error deleting post skills.' });
        }

        // Then delete the post
        const deletePostSql = 'DELETE FROM posts WHERE post_id = ? AND user_id = ?';
        db.query(deletePostSql, [postId, userId], (err, result) => {
            if (err) {
                console.error('Error deleting post:', err);
                return res.status(500).json({ success: false, message: 'Error deleting post.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Post not found.' });
            }

            res.json({ success: true, message: 'Post deleted successfully.' });
        });
    });
});

// Render the 'search' page
router.get('/search', (req, res) => {
    const query = `
        SELECT 
            showcases.image_url, 
            users.username AS skill_seeker, 
            showcases.title, 
            showcases.description, 
            showcases.created_at, 
            skills.skill_name
        FROM showcases
        JOIN users ON showcases.user_id = users.user_id
        JOIN showcase_skills ON showcases.showcase_id = showcase_skills.showcase_id
        JOIN skills ON showcase_skills.skill_id = skills.skill_id
        ORDER BY showcases.created_at DESC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching showcases:', err);
            return res.status(500).send('Server error');
        }

        res.render('search', { showcases: results, user: req.user });
    });
});

// Render the 'anotherProfile' page
router.get('/anotherProfile/:post_id', (req, res) => {
    const post_id = req.params.post_id;
    console.log(post_id);

    // First, fetch the user_id associated with the given post_id
    const getUserIdQuery = `
        SELECT user_id FROM posts WHERE post_id = ?;
    `;

    db.query(getUserIdQuery, [post_id], (err, userIdResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        if (userIdResult.length === 0) {
            return res.status(404).send('Post not found');
        }

        const user_id = userIdResult[0].user_id;

        // Now that we have the user_id, proceed with fetching the user's profile information
        const query = `
            SELECT 
                u.user_id, 
                u.username, 
                u.email, 
                u.profile_photo, 
                u.availability, 
                u.rating, 
                u.created_at, 
                s.skill_name AS user_skill_name, 
                sh.showcase_id, 
                sh.title AS showcase_title, 
                sh.description AS showcase_description, 
                sh.image_url AS showcase_image_url, 
                sh.created_at AS showcase_created_at, 
                ss.skill_name AS showcase_skill_name,
                p.post_id, 
                p.title AS post_title, 
                p.content AS post_content, 
                p.created_at AS post_created_at, 
                ps.skill_name AS post_skill_name
            FROM 
                users u
            LEFT JOIN 
                user_skills us ON u.user_id = us.user_id
            LEFT JOIN 
                skills s ON us.skill_id = s.skill_id
            LEFT JOIN 
                showcases sh ON u.user_id = sh.user_id
            LEFT JOIN 
                showcase_skills sks ON sh.showcase_id = sks.showcase_id
            LEFT JOIN 
                skills ss ON sks.skill_id = ss.skill_id
            LEFT JOIN 
                posts p ON u.user_id = p.user_id
            LEFT JOIN 
                post_skills psk ON p.post_id = psk.post_id
            LEFT JOIN 
                skills ps ON psk.skill_id = ps.skill_id
            WHERE 
                u.user_id = ?;
        `;

        db.query(query, [user_id], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }

            if (results.length === 0) {
                return res.status(404).send('Profile not found');
            }

            const userProfile = {
                user_id: results[0].user_id,
                username: results[0].username,
                email: results[0].email,
                profile_photo: results[0].profile_photo,
                availability: results[0].availability,
                rating: results[0].rating,
                created_at: results[0].created_at,
                skills: [],
                showcases: {}
            };

            results.forEach(row => {
                if (row.user_skill_name && !userProfile.skills.find(skill => skill.skill_name === row.user_skill_name)) {
                    userProfile.skills.push({ skill_name: row.user_skill_name });
                }

                if (row.showcase_id) {
                    if (!userProfile.showcases[row.showcase_id]) {
                        userProfile.showcases[row.showcase_id] = {
                            showcase_id: row.showcase_id,
                            title: row.showcase_title,
                            description: row.showcase_description,
                            image_url: row.showcase_image_url,
                            created_at: row.showcase_created_at,
                            skills: []
                        };
                    }

                    if (row.showcase_skill_name && !userProfile.showcases[row.showcase_id].skills.find(skill => skill.skill_name === row.showcase_skill_name)) {
                        userProfile.showcases[row.showcase_id].skills.push({ skill_name: row.showcase_skill_name });
                    }
                }
            });

            userProfile.showcases = Object.values(userProfile.showcases);

            res.render('anotherProfile', { profile: userProfile });
        });
    });
});



// Route to render the privacy policy page
router.get('/privacy', (req, res) => {
    res.render('privacy_policy', { user: req.user }); // Pass the user object if needed
});
module.exports = router;