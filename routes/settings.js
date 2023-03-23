const router = require('express').Router();
const user = require('../models/users')
const post = require('../models/posts')
const { auth } = require('../auth')
const { baseURL } = require('../auth')
const bcrypt = require('bcrypt')
const cloudinary = require('../fileUpload')


router.route('/')
    .get(auth, (req, res) => {
        res.render('settings');
    })

router.route('/updateProfile')
    .get(auth, async(req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
       
        if(userFound === null){
            return res.json({
                status:"error",
                message:"User logged out",
            })
        }

        user.find({ accessToken: req.accessToken }).exec((err, users) => {
            // console.log(users)
            if (err) {
                res.json({ message: err.message });
            }
            else {
                res.render('updateProfile', { user: users[0] })
            }
        })
    })

router.route('/uploadCoverPhoto')
    .post(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
       
        if(userFound === null){
            return res.json({
                status:"error",
                message:"User logged out",
            })
        }

        cloudinary.uploader.upload(`data:${req.body.fileType};base64,${req.body.base64String}`, {  
            resource_type: 'raw',
            folder: 'famesbook',
            width: 1000,
            height: 600
            // crop: "scale"
        }).then((result) => { 
            user.findByIdAndUpdate(userFound._id, { $set: { coverPhoto: result.url } }, { new: true }).exec().then((user) => {
                // res.redirect('/settings/updateProfile',{user})
                res.json({
                    "status": "success",
                    "message": "profile updated succesfully"
                })
            }).catch((err) => {
                console.log(err)
            })
        }).catch((error)=>{
            console.log("error occured")
            res.json({
                "status": "error",
                "message": "file too large"
            })
        })

    })

router.route('/uploadProfileImg')
    .post(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        if(userFound === null){
            return res.json({
                status:"error",
                message:"User logged out",
            })
        }

        cloudinary.uploader.upload(`data:${req.body.fileType};base64,${req.body.base64String}`, {
            resource_type: 'raw',
            folder: 'famesbook',
            width: 1000,
            height: 600
            // crop: "scale"
        }).then((result) => {
           
            user.findByIdAndUpdate(userFound._id, { $set: { profilePhoto: result.url } }, { new: true }).exec().then(async (user) => {

                await post.updateMany({}, {
                    $set: {
                        "comments.$[eleX].user.profileImage": result.url
                    }
                }, {
                    arrayFilters: [{
                        "eleX.user._id": userFound._id
                    }]
                })

                await post.updateMany({ "owner._id": userFound._id }, {
                    $set: {
                        "owner.profileImage": result.url
                    }
                })

                res.json({
                    "status": "success",
                    "message": "profile updated succesfully"
                })
            }).catch((err) => {
                console.log(err)
            });
        }).catch((error) => {
            console.log("error occured")
            res.json({
                "status": "error",
                "message": "file too large"
            })
        })
    })

router.route('/updateInfo/:id')
    .post(async (req, res) => {
        try {
            user.findOneAndUpdate({ _id: req.params.id }, {
                $set: {
                    name: req.body.name,
                    username: req.body.name,
                    email: req.body.email,
                    dob: req.body.dob,
                    city: req.body.city,
                    country: req.body.country,
                    aboutMe: req.body.aboutMe
                }
            }, async (err, result) => {
                await post.updateMany({ "owner._id": req.params.id }, {
                    $set: {
                        "owner.name": req.body.name
                    }
                })
                await post.updateMany({}, {
                    $set: {
                        "comments.$[eleX].user.name": req.body.name,
                    }
                }, {
                    arrayFilters: [{
                        "eleX.user._id": req.params.id
                    }]
                })
                if (err)
                    res.send("sorry an error occured")
                else
                    res.redirect(`${baseURL}/settings/updateProfile`)
            })

        } catch (error) {
            res.send(error)
        }
    })


router.route('/passChange')
    .get(auth, async (req, res) => {
        user.find({ accessToken: req.accessToken }).exec((err, users) => {
            if (err) {
                res.json({ message: err.message });
            }
            else {
                res.render('passChange', { user: users[0], message: req.session.message })
                console.log(req.session.message)
            }
        })
    })
    .post(async (req, res) => {
        var accessToken = req.body.accessToken;
        console.log(req.body.prevPass)
        const userFound = await user.findOne({ accessToken });

        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "user has been logged out"
            })
        } else {
            bcrypt.compare(req.body.prevPass, userFound.password, (err, result) => {
                if (result) {
                    res.json({
                        "status": "success"
                    })
                } else {
                    res.json({
                        status: "error",
                        message: "Sorry your password dosent match"
                    })

                }
            })

        }
    })
router.route('/confirmPassChange')
    .post(auth, async (req, res) => {
        var newPass = req.body.newPass;
        var confPass = req.body.confPass;
        var accessToken = req.accessToken
        console.log(req.accessToken)
        var userFound = await user.findOne({ accessToken });

        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "user has been logged out"
            })
        } else {
            if (newPass === confPass) {
                bcrypt.hash(newPass, 10, (err, hashed) => {

                    user.updateOne({ accessToken }, { $set: { password: hashed } }, (err, result) => {
                        if (err) {
                            res.json({
                                "status": "error",
                                "message": "sorry there was some error."
                            })

                        } else {
                            req.session.message = {
                                message: "Password updated succesfully"
                            }
                            //console.log(req.session.message)
                            res.redirect(`${baseURL}/passChange`)
                        }
                    })
                })
            } else
                res.json({
                    "status": "error",
                    "message": "password dosent match"
                })
        }
    })

router.route('/logout')
    .get(auth, async (req, res) => {
        res.clearCookie('jwt')
        res.redirect(`${baseURL}`)
    })



module.exports = router