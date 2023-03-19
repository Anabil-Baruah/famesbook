const router = require('express').Router();
const user = require('../models/users')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
require('dotenv').config()

router.route('/')
    .get((req, res) => {
        res.render('login')
    })
    .post(async (req, res) => {
        var email = req.body.email;
        var password = req.body.password;

        const userFound = await user.findOne({ email })
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User does ont exist"
            });
        } else {
            const passMatch = await bcrypt.compare(password, userFound.password)

            if (passMatch) {
                var accessToken = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);

                user.findOneAndUpdate({ email }, {
                    $set: {
                        accessToken
                    }
                }, (err, data) => {
                    if (!err) {
                        res.cookie('jwt', accessToken)
                        res.redirect('/')
                    } else {
                        res.redirect('/login')
                    }
                })
            } else {
                res.json({
                    "status": "error",
                    "message": "Password is incorrect"
                })
            }
        }
    })

module.exports = router