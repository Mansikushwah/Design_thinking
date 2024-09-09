const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const flash = require('connect-flash');

dotenv.config();

const app = express();

// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
// EJS
app.set('view engine', 'ejs');

// Express Session
app.use(session({
    secret: 'SESSION_SECRET',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(function(req, res, next) {
    res.locals.success_flash = req.flash('success');
    res.locals.error_flash = req.flash('error');
    next();
});
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);
// Static Files
app.use(express.static('public'));

// Routes
app.use( require('./routes/index'));
app.use( require('./routes/auth'));
app.use('/', require('./routes/about'));
const contactRoute = require('./routes/contact');
app.use(contactRoute);
//app.use('/',require('./routes/contact'));
app.use((req, res, next) => {
    console.log(`Request URL: ${req.url}`);
    next();
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});