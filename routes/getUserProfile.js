const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const { auth } = require('../auth')
const { baseURL } = require('../auth')

require('dotenv').config()

const { formatDate } = require('../formatDate')



router.route('/')
    .get(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        if (userFound) {
            var ids = [];
            ids.push(userFound._id);


            ids.reverse()
            var posts = await post.find({
                "owner._id": {
                    $in: ids
                }
            })
            posts = formatDate(posts)
            res.render('userProfile', { user: userFound, posts: posts, isOwner: true, baseURL })
        }
    })

router.route('/:userId')
    .get(auth, async (req, res) => {
        const friendFound = await user.findOne({ _id: req.params.userId })
        const userFound = await user.findOne({ accessToken: req.accessToken })

        if (req.params.userId.toString() === userFound._id.toString())
            return res.redirect('/user')

        if (friendFound) {
            var ids = [];
            ids.push(friendFound._id);


            ids.reverse()
            var posts = await post.find({
                "owner._id": {
                    $in: ids
                }
            })
            posts = formatDate(posts)


            var isFriend = userFound.friends.find(frnd => frnd._id.toString() === friendFound._id.toString())
            res.render('userProfile', { user: friendFound, posts: posts, isOwner: false, isFriend, baseURL })
        }

    })

router.route('/deletePost')
    .post(auth, async (req, res) => {

        const _id = req.body._id;
        const accessToken = req.accessToken;


        const userFound = await user.findOne({ accessToken });
        const postFound = await post.findById({ _id })


        // console.log(user)
        if (userFound == null) {
            return res.json({
                status: "error",
                message: "You are logged out"
            })
        } else {
            if (userFound._id.toString() === postFound.owner._id.toString()) {
                const deleted = await post.findOneAndDelete({ "_id": _id })

                if (deleted) {
                    user.updateOne({ "_id": userFound._id }, {
                        $pull: {
                            posts: {
                                _id: _id
                            }
                        }
                    }, (err, result) => {
                        res.json({
                            status: "success",
                            message: "post has been deleted"
                        })
                    })
                }
            } else {
                res.json({
                    status: "error",
                    message: "unauthorize"
                })
            }
        }
    })

router.route('/updatePost')
    .post(auth, async (req, res) => {
        const _id = req.body.postId;
        const accessToken = req.accessToken;

        const userFound = await user.findOne({ accessToken });
        const postFound = await post.findById({ _id })
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "user has been logged out"
            })
        } else {
            if (userFound._id.toString() === postFound.owner._id.toString()) {
                post.findOneAndUpdate({ _id }, {
                    $set: {
                        caption: req.body.caption
                    }
                }, (err, data) => {
                    // res.send({
                    //     "status": "success",
                    //     "message": "post has been updated"
                    // })
                    res.redirect(`${baseURL}/user`)
                })
            } else {
                res.json({
                    status: "error",
                    message: "unauthorize"
                })
            }
        }

    })

router.route('/image/:filename')
    .get(auth, (req, res) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0)
                return res.status(404).json({
                    err: "No files exist"
                })
            //check if image
            if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                const readstream = gridfsBucket.openDownloadStreamByName(file.filename);
                readstream.pipe(res)
            } else {
                res.status(404).json({ err: "Not an image" })
            }
        })
    })

router.route('/video/:filename')
    .get((req, res) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0)
                return res.status(404).json({
                    err: "No files exist"
                })
            //check if image
            if (file.contentType === 'video/mp4') {
                const readstream = gridfsBucket.openDownloadStreamByName(file.filename);
                readstream.pipe(res)
            } else {
                res.status(404).json({ err: "Not an video" })
            }
        })
    })

module.exports = router