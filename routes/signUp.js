const router = require('express').Router();
const user = require('../models/users')
require('cookie-parser');
const { baseURL } = require('../auth')

router.route('/')
    .get((req, res) => {
        res.render('signUp')
    })
    .post(async (req, res) => {
        const userExist = await user.findOne({ email: req.body.email })
        if (userExist) {
            return res.render('login', { "message": "Sorry user already exxists" })
        }
        const newUser = new user({
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            gender: req.body.gender

        })
        //generating token
        const token = await newUser.generateAuthToken();

        res.cookie("jwt", token, {
            httpOnly: true
        });
        const result = await newUser.save()

        if (result) {

            // req.session.message = {
            //     message: 'user inserted succesfully',
            //     type: 'success'
            // }
            res.redirect(`${baseURL}`)
        }
        else {
            res.json({ message: err.message, type: 'danger' })
        }
    })

module.exports = router