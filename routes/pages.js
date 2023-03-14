const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const {auth} = require('../auth')
const path = require('path');
const page = require('../models/pages')
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
// const methodOverride = require('method-override');
const Grid = require('gridfs-stream');
const bcrypt = require('bcrypt')
const multer = require('multer');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId

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
        res.render('pages', { pages: userFound.pages })
    })


router.route('/:id')
    .get(auth, async (req, res) => {
        const pageFound = await page.findOne({ _id: req.params.id })
        const userFound = await user.findOne({ accessToken: req.accessToken })

        let isFollow = false
        pageFound.members.forEach((member) => {

            if (userFound._id.toString() === member._id.toString())
                isFollow = true

        })

        res.render('viewPage', { page: pageFound, user: userFound, isFollow })
    })


router.route('/toggleFollowPages')
    .post(auth, async (req, res) => {
        var accessToken = req.accessToken;
        var _id = req.body._id

        const userFound = await user.findOne({ accessToken });

        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            })
        } else {
            const pageFound = await page.findOne({ _id: _id });
            if (pageFound == null) {
                res.json({
                    "status": "error",
                    "message": "Page not found"
                })
            } else {
                var isLiked = false;
                for (a = 0; a < pageFound.members.length; a++) {
                    var liker = pageFound.members[a];
                    if (liker._id.toString() == userFound._id.toString()) {
                        isLiked = true;
                        break;
                    }
                }
                if (isLiked) {
                    page.updateOne({ "_id": _id }, {
                        $pull: {
                            "members": {
                                "_id": userFound._id
                            }
                        }
                    }, (err, data) => {
                        user.updateOne({ accessToken }, {
                            $pull: {
                                pages: {
                                    _id: _id
                                }
                            }
                        }, (err, data) => {
                            res.json({
                                "status": "unliked",
                                "message": "page has been unliked"
                            })
                        })
                    })
                } else {
                    page.updateOne({ _id: _id }, {
                        $push: {
                            members: {
                                _id: userFound._id,
                                name: userFound.name,
                                profileImage: userFound.profilePhoto
                            }
                        }
                    }, (err, data) => {
                        user.updateOne({ accessToken }, {
                            $push: {
                                pages: {
                                    _id: pageFound._id,
                                    name: pageFound.name,
                                    coverPhoto: pageFound.coverPhoto
                                }
                            }
                        }, (err, data) => {
                            res.json({
                                "status": "success",
                                "message": "Page has been liked"
                            })
                        })
                    })
                }
            }
        }
    })

router.route('/image/:filename')
    .get((req, res) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0)
                return res.status(404).json({
                    err: "No files exist"
                })
            //check if image
            if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
                const readstream = gridfsBucket.openDownloadStreamByName(file.filename);
                readstream.pipe(res)
            } else {
                res.status(404).json({ err: "Not an image" })
            }
        })
    })



module.exports = router