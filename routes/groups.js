const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const { auth } = require('../auth')
const path = require('path');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
// const methodOverride = require('method-override');
const Grid = require('gridfs-stream');
const bcrypt = require('bcrypt')
const multer = require('multer');
const mongodb = require('mongodb');
const group = require('../models/groups');
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
        res.render('groups', { groups: userFound.groups })
        console.log(userFound.groups.length)
    })


router.route('/:id')
    .get(auth, async (req, res) => {
        const groupFound = await group.findOne({ _id: req.params.id })
        const userFound = await user.findOne({ accessToken: req.accessToken })
        let isJoin = false

        const isMember = groupFound.members.filter(member => member._id.toString() === userFound._id.toString())

        // console.log(isMember)
        var userAccepted = false

        if (isMember.length !== 0) {
            if (isMember[0].status !== "Pending")
                userAccepted = true
            isJoin = true
        }

        res.render('viewGroup', { group: groupFound, user: userFound, userAccepted, isJoin })
    })

router.route('/toggleJoinGroup')
    .post(auth, async (req, res) => {
        var accessToken = req.accessToken;
        const _id = req.body._id;
        

        const userFound = await user.findOne({ accessToken });
        const groupFound = await group.findOne({ _id: _id });
       

        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            });
        } else {
            var isMember = false;
            for (var a = 0; a < groupFound.members.length; a++) {
                var member = groupFound.members[a];

                if (member._id.toString() == userFound._id.toString()) {
                    isMember = true;
                    break;
                }
            }
            if (isMember) {
                group.updateOne({ _id: _id }, {
                    $pull: {
                        "members": {
                            "_id": userFound._id
                        }
                    }
                }, (err, data) => {
                    user.updateOne({ accessToken }, {
                        $pull: {
                            groups: { _id: _id }
                        }
                    }, (err, data) => {
                        res.json({
                            "status": "leave",
                            "message": "Group has been left"
                        })
                    })
                });
            } else {
                try {

                    await user.updateOne({ _id: groupFound.owner._id }, {
                        $push: {
                            notifications: {
                                _id: new ObjectId(),
                                type: "group_join_request",
                                content: `${userFound.name} sent a request to join your group.`,
                                profilePhoto: userFound.profilePhoto,
                                groupId: groupFound._id,
                                userId: userFound._id,
                            }
                        }
                    });


                    group.updateOne({ _id: _id }, {
                        $push: {
                            members: {
                                _id: userFound._id,
                                name: userFound.name,
                                profileImage: userFound.profileImage,
                                status: "Pending"
                            }
                        }
                    }, (err, data) => {
                        user.updateOne({ accessToken }, {
                            $push: {
                                groups: {
                                    _id: groupFound._id,
                                    name: groupFound.name,
                                    coverPhoto: groupFound.coverPhoto,
                                    status: "Pending"
                                }
                            }
                        }, (err, data) => {

                            res.json({
                                "status": "success",
                                "message": "Request to join the group has been sent"
                            })
                        });
                    })
                } catch (error) {
                    console.log(error)
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