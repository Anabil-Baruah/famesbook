const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 3000
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', express.static(__dirname + '/public'));
app.use('/settings', express.static(__dirname + '/public'));
app.use('/create', express.static(__dirname + '/public'));
app.use('/friends', express.static(__dirname + '/public'));
app.use('/user', express.static(__dirname + '/public'));
app.use('/search', express.static(__dirname + '/public'));
// app.use('/search/pages', express.static(__dirname + '/public'));
app.use('/groups', express.static(__dirname + '/public'));
app.use('/pages', express.static(__dirname + '/public'));

// app.use(session({
//     secret: 'my secret key',
//     saveUninitialized: true,
//     resave: false
// }))

// app.use((req, res, next) => {
//     res.locals.message = req.session.message;
//     delete req.session.message;
//     next();
// })
app.use(session({
    secret: 'secret-key',  // Secret key to sign the session ID cookie
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }  // Secure flag for the session ID cookie
}));

app.use('/', require('./routes/index'))
app.use('/login', require('./routes/login'))
app.use('/signUp', require('./routes/signUp'))
app.use('/settings', require('./routes/settings'))
app.use('/create', require('./routes/create'))
app.use('/friends', require('./routes/friends'))
app.use('/notifications', require('./routes/notifications'))
app.use('/groups', require('./routes/groups'))
app.use('/pages', require('./routes/pages'))
app.use('/user', require('./routes/getUserProfile'))
app.use('/search', require('./routes/search'))
app.use(function(req, res, next) {
    res.status(404).render('404');
 });

app.set('view engine', 'ejs');
app.listen(port, () => {
    console.log("server started")
})