const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const group = require('../models/groups')
const page = require('../models/pages')
const { auth, baseURL } = require('../auth')
const cloudinary = require('../fileUpload')

const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId



router.route('/')
    .get(auth, (req, res) => {
        res.render('create')
    })

router.route('/createPage')
    .post(auth, async (req, res) => {
        var name = req.body.name;
        var domainName = req.body.domainName;
        var additionalInfo = req.body.additionalInfo;
        console.log(req.filename)
        console.log(req.coverPhoto)

        const userFound = await user.findOne({ accessToken: req.accessToken });
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            });
        } else {
            cloudinary.uploader.upload(`data:${req.body.fileType};base64,${req.body.base64String}`, {
                resource_type: 'raw',
                folder: 'famesbook',
                width: 1000,
                height: 600
                // crop: "scale"
            }).then(async (result) => {
                const newPage = new page({
                    name,
                    domainName,
                    additionalInfo,
                    coverPhoto: result.url,
                    members: [{
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }],
                    owner: {
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }
                })
                console.log(result)
                const isCreated = await newPage.save()
                if (isCreated) {
                    await user.updateOne({ accessToken: req.accessToken }, {
                        $push: {
                            pages: {
                                _id: newPage._id,
                                name: newPage.name,
                                coverPhoto: newPage.coverPhoto
                            }
                        }
                    })
                    res.redirect(`${baseURL}/create`)
                }
                else
                    res.json({
                        status: "failure"
                    })
            }).catch((err) => {
                console.log("error occured")
                res.json({
                    "status": "error",
                    "message": "File is too large"
                })
            })
        }
    })
router.route('/createGroup')
    .post(auth, async (req, res) => {
        var name = req.body.name;
        var additionalInfo = req.body.additionalInfo;

        const userFound = await user.findOne({ accessToken: req.accessToken });
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            });
        } else {
            cloudinary.uploader.upload(`data:${req.body.fileType};base64,${req.body.base64String}`, {
                resource_type: 'raw',
                folder: 'famesbook',
                width: 1000,
                height: 600
                // crop: "scale"
            }).then(async (result) => {

                const newGroup = new group({
                    name,
                    additionalInfo,
                    coverPhoto: result.url,
                    members: [
                        {
                            _id: userFound._id,
                            name: userFound.name,
                            profileImage: userFound.profileImage,
                            status: "Accepted"
                        }
                    ],
                    owner: {
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }
                })

                const isCreated = await newGroup.save()
                console.log(isCreated)
                if (isCreated) {
                    await user.updateOne({ accessToken: req.accessToken }, {
                        $push: {
                            groups: {
                                _id: newGroup._id,
                                name: newGroup.name,
                                coverPhoto: newGroup.coverPhoto,
                                status: "Accepted"
                            }
                        }
                    })

                    res.redirect(`${baseURL}/create`)
                }
                else
                    res.json({
                        status: "failure"
                    })

            }).catch((error) => {
                console.log("error occured")
                res.json({
                    "status": "error",
                    "message": "File is too large"
                })
            })

        }
    })

module.exports = router