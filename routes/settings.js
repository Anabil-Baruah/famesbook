const router = require('express').Router();
const user = require('../models/users')
const post = require('../models/posts')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
// const methodOverride = require('method-override');
const Grid = require('gridfs-stream');
const { auth } = require('../auth')
const { baseURL } = require('../auth')
const bcrypt = require('bcrypt')



let gfs, gridfsBucket;

const conn = mongoose.createConnection('mongodb://localhost:27017/File_uploads')

conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
})

//create storage engine
const storage = new GridFsStorage({
    url: 'mongodb://localhost:27017/File_uploads',
    file: (req, file) => {
        return new Promise((resolve, rejects) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err)
                    return rejects(err)

                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename,
                    bucketName: 'uploads'  //bucket name should mathch the collection name
                };
                resolve(fileInfo)
                req.filename = filename
            })
        })
    }
});
const upload = multer({ storage });

router.route('/')
    .get(auth, (req, res) => {
        res.render('settings');
    })

router.route('/updateProfile')
    .get(auth, (req, res) => {
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

router.route('/uploadCoverPhoto/:id')
    .post(auth, upload.single('coverPhoto'), (req, res) => {
        user.findByIdAndUpdate(req.params.id, { $set: { coverPhoto: req.filename } }, { new: true }).exec().then((user) => {
            // res.redirect('/settings/updateProfile',{user})
            res.redirect('/settings/updateProfile')
        }).catch((err) => {
            console.log(err)
        });
    })

router.route('/uploadProfileImg/:id')
    .post(auth, upload.single('profileImage'), async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        user.findByIdAndUpdate(req.params.id, { $set: { profilePhoto: req.filename } }, { new: true }).exec().then(async (user) => {
            // const comments = await post.aggregate([
            //     // Match documents where the _id field is not equal to userFound._id
            //     { $match: { _id: { $ne: userFound._id } } },
            //     // Lookup the friends array and filter out the documents where userFound is already a friend
            //     {
            //       $lookup: {
            //         from: "users",
            //         localField: "friends._id",
            //         foreignField: "_id",
            //         as: "friendsDetails",
            //       },
            //     },
            //     {
            //       $match: {
            //         "friendsDetails._id": { $ne: userFound._id },
            //       },
            //     },
            //     // Project only the fields that are needed
            //     {
            //       $project: {
            //         _id: 1,
            //         name: 1,
            //         email: 1,
            //         profilePhoto:1
            //       },
            //     },
            //   ]);

            await post.updateMany({}, {
                $set: {
                    "comments.$[eleX].user.profileImage": req.filename
                }
            }, {
                arrayFilters: [{
                    "eleX.user._id": userFound._id
                }]
            })

            await post.updateMany({ "owner._id": userFound._id }, {
                $set: {
                    "owner.profileImage": req.filename
                }
            })

            res.redirect('/settings/updateProfile')
        }).catch((err) => {
            console.log(err)
        });
    })

router.route('/updateInfo/:id')
    .post(async (req, res) => {
        try {
            user.findOneAndUpdate({ _id: req.params.id }, {
                $set: {
                    name: req.body.name,
                    email: req.body.email,
                    dob: req.body.dob,
                    city: req.body.city,
                    country: req.body.country,
                    aboutMe: req.body.aboutMe
                }
            }, (err, result) => {
                if (err)
                    res.send("sorry an error occured")
                else
                    res.redirect('/settings/updateProfile')
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
                            res.redirect('passChange')
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

router.route('/image/:filename')
    .get((req, res) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0)
                return res.status(404).json({
                    err: "No files exist"
                })
            //check if image
            if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/jpg') {
                const readstream = gridfsBucket.openDownloadStreamByName(file.filename);
                readstream.pipe(res)
            } else {
                res.status(404).json({ err: "Not an image" })
            }
        })
    })



module.exports = router