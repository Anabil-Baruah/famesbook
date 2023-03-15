const jwt = require('jsonwebtoken');
const register = require("./models/users");
const baseURL = 'http://localhost:3000'
require('dotenv').config()

const auth = async (req, res, next) => {
    try {
        
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // console.log(verifyUser);

        const user = await register.findOne({ _id: verifyUser._id });

        req.user = user;
        req.accessToken = token
        next();
    } catch (error) {
        
        // res.status(404).send(error);
        // res.render('user_login');
        // req.session.message = {
        //     message: 'Login To continue',
        //     type: 'warning'
        // }
        res.redirect(`${baseURL}/login`)
    }
}

module.exports = {auth, baseURL};