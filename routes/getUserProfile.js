const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const {auth} = require('../auth')
const path = require('path');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
// const methodOverride = require('method-override');
const Grid = require('gridfs-stream');
require('dotenv').config()
const multer = require('multer');
const mongodb = require('mongodb');


let gfs, gridfsBucket;

const conn = mongoose.createConnection(process.env.MONGO_URL_FILE_UPLOADS)

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
                console.log(file);
                resolve(fileInfo)
                req.filename = filename,
                    req.contentType = file.mimetype
            })
        })
    }
});
const upload = multer({ storage });

router.route('/')
    .get(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        if (userFound) {
            var ids = [];
            ids.push(userFound._id);


            ids.reverse()
            const posts = await post.find({
                "owner._id": {
                    $in: ids
                }
            })
           
            res.render('userProfile', { user: userFound, posts: posts, isOwner: true })
        }
    })

router.route('/:userId')
    .get(auth, async (req, res) => {
        const friendFound = await user.findOne({ _id: req.params.userId })
        const userFound = await user.findOne({ accessToken: req.accessToken })

        if (friendFound) {
            var ids = [];
            ids.push(friendFound._id);


            ids.reverse()
            const posts = await post.find({
                "owner._id": {
                    $in: ids
                }
            })
            console.log(posts)

            var isFriend = userFound.friends.find(frnd => frnd._id.toString() === friendFound._id.toString())
            res.render('userProfile', { user: friendFound, posts: posts, isOwner: false , isFriend})
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
                    res.redirect('/user')
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