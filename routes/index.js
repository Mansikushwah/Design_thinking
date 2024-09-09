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
        res.render('index', { user: req.user });
    
});

// Render the 'search_people' page
// Route to handle the search query
// Route to render the initial search_people page
router.get('/search_people', (req, res) => {
    const sql = `
        SELECT u.username, u.email, u.profile_photo_url AS profile_photo_url, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        GROUP BY u.user_id, u.username, u.email, u.profile_photo_url`;

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
        SELECT u.username, u.email, u.profile_photo_url AS profile_photo_url, 
               GROUP_CONCAT(s.skill_name SEPARATOR ', ') AS skills
        FROM users u
        JOIN user_skills us ON u.user_id = us.user_id
        JOIN skills s ON us.skill_id = s.skill_id
        WHERE s.skill_name LIKE ?
        GROUP BY u.user_id, u.username, u.email, u.profile_photo_url`;

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


router.get('/showcase/:id', async (req, res) => {
    const showcaseId = req.params.id;

    try {
        const [rows] = await db.promise().query('SELECT * FROM showcases WHERE showcase_id = ?', [showcaseId]);

        if (rows.length > 0) {
            res.render('showcase', { showcase: rows[0] });
        } else {
            res.status(404).send('Showcase not found');
        }
    } catch (error) {
        console.error('Error fetching showcase:', error);
        res.status(500).send('Server error');
    }
});

// Handle the POST request to '/add_showcase' with multer middleware
router.post('/add_showcase', upload.single('image'), (req, res) => {
    console.log('Request received at /add-showcase');
    console.log(req.body);  // Log the request body (title, description)

    const { title, description } = req.body;
    const file = req.file;  // File object handled by multer

    // Check if the file has been uploaded successfully
    if (file) {
        const imagePath = `/uploads/${file.filename}`;  // Path to save in the database
        console.log('File upload successful:', imagePath);

        // SQL query to insert the showcase data
        const sql = 'INSERT INTO showcases (title, description, image_url) VALUES (?, ?, ?)';
        db.query(sql, [title, description, imagePath], (err, result) => {
            if (err) {
                console.error('Error inserting showcase:', err);
                res.status(500).send('Database error');
                return;
            }
            console.log('Showcase added to the database:', result);
            res.send('Showcase added successfully!');
        });
    } else {
        console.log('File upload failed');
        res.status(400).send('File upload failed');
    }

    console.log('Title:', title);
    console.log('Description:', description);
    console.log('File:', file);  // Should log the file object if successful
});


// Render the 'post' page
router.get('/post', (req, res) => {
    res.render('post');
});

// Render the 'profile' page
router.get('/profile', (req, res) => {
    const user = req.user; 
    console.log("thsii");
    console.log(user);
    // Fetch user details
    console.log(user.user_id)
        // Fetch skills for this user
        db.query('SELECT s.skill_id, s.skill_name FROM skills s JOIN user_skills us ON s.skill_id = us.skill_id WHERE us.user_id = ?', [user.user_id], (err, skillResults) => {
            if (err) throw err;

            const skills = skillResults;
            console.log(skills);
            // Render profile page with user and skills data
            res.render('profile', { user, skills });
        });
});

router.post('/add_showcase', upload.single('image'), (req, res) => {
    const { title, description, skills } = req.body;
    const userId = req.session.user_id; // Assuming user_id is stored in session
    const imagePath = req.file ? req.file.filename : null;

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


// Render the 'search' page
router.get('/search', (req, res) => {
    res.render('search',{ user: req.user });
});

module.exports = router;
