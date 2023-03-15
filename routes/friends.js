const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const { auth } = require('../auth')
const { baseURL } = require('../auth')
const path = require('path');
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

        const newRequest = userFound.friends.filter(frnd => frnd.status == "pending");
        const friends = userFound.friends.filter(frnd => frnd.status !== "pending");

        const suggestions = await user.aggregate([
            // Match documents where the _id field is not equal to userFound._id
            { $match: { _id: { $ne: userFound._id } } },
            // Lookup the friends array and filter out the documents where userFound is already a friend
            {
                $lookup: {
                    from: "users",
                    localField: "friends._id",
                    foreignField: "_id",
                    as: "friendsDetails",
                },
            },
            {
                $match: {
                    "friendsDetails._id": { $ne: userFound._id },
                },
            },
            // Project only the fields that are needed
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    profilePhoto: 1
                },
            },
        ]);
        res.render('friends', { friends, newRequest, suggestions, baseURL })
    })


router.route('/toggleFriendRequest')
    .post(auth, async (req, res) => {
        var accessToken = req.accessToken;
        var _id = req.body._id

        const userFound = await user.findOne({ accessToken });
        const friendFound = await user.findOne({ _id })

        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            })
        } else {
            var isFriend = false;
            for (a = 0; a < userFound.friends.length; a++) {
                var frnd = userFound.friends[a];
                if (frnd._id.toString() == friendFound._id.toString()) {
                    isFriend = true;
                    break;
                }
            }
            if (isFriend) {
                user.updateOne({ "_id": _id }, {
                    $pull: {
                        "friends": {
                            "_id": userFound._id
                        }
                    }
                }, (err, data) => {
                    user.updateOne({ _id: userFound._id }, {
                        $pull: {
                            friends: {
                                _id: _id
                            }
                        }
                    }, async (err, data) => {
                        await user.updateOne({ "_id": friendFound._id }, {
                            $pull: {
                                "notifications": {
                                    userId: userFound._id
                                }
                            }
                        })
                        res.json({
                            "status": "unfriend",
                            "message": "friend has been removed from your friend list"
                        })
                    })
                })
            } else {
                user.updateOne({ _id: friendFound._id }, {
                    $push: {
                        friends: {
                            _id: userFound._id,
                            name: userFound.name,
                            profilePhoto: userFound.profilePhoto,

                        }
                    }
                }, (err, data) => {
                    user.updateOne({ _id: userFound._id }, {
                        $push: {
                            friends: {
                                _id: friendFound._id,
                                name: friendFound.name,
                                profilePhoto: friendFound.profilePhoto,
                                status: "Accepted"
                            }
                        }
                    }, async (err, data) => {
                        await user.updateOne({ "_id": friendFound._id }, {
                            $push: {
                                "notifications": {
                                    _id: new ObjectId(),
                                    type: "friend_request",
                                    content: `${userFound.name} sent you a friend request`,
                                    profilePhoto: userFound.profilePhoto,
                                    userId: userFound._id
                                }
                            }
                        })
                        res.json({
                            "status": "friend",
                            "message": `Request has been send to ${friendFound.name}`
                        })
                    })
                })
            }
        }
    })

router.route('/acceptRequest')
    .post(auth, async (req, res) => {
        var accessToken = req.accessToken
        var _id = req.body._id;

        const userFound = await user.findOne({ accessToken })
        if (userFound == null) {
            return res.json({
                status: "Error",
                message: "User has been logged out"
            })
        } else {
            user.update({ _id: userFound._id }, {
                $set: {
                    "friends.$[elem].status": "Accepted"
                }
            }, { "arrayFilters": [{ "elem._id": _id }] }, async(err, result) => {
                if (!err) {
                    res.json({
                        status: "Accepted",
                        message: "Request has been accepted"
                    })
                    await user.updateOne({ "_id": _id }, {
                        $push: {
                            "notifications": {
                                _id: new ObjectId(),
                                type: "friend_request",
                                content: `${userFound.name} accepted your friend request`,
                                profilePhoto: userFound.profilePhoto,
                                userId: userFound._id
                            }
                        }
                    })
                }
                else
                    res.json({
                        status: "error",
                        message: "Sorry some error occured please try again later"
                    })
            })
        }

    })

router.route('/rejectRequest')
    .post(auth, async (req, res) => {
        var accessToken = req.accessToken
        var _id = req.body._id;
        const userFound = await user.findOne({ accessToken })
        if (userFound == null) {
            return res.json({
                status: "Error",
                message: "User has been logged out"
            })
        } else {
            console.log(_id)
            user.updateOne({ "_id": _id }, {
                $pull: {
                    friends: {
                        _id: userFound._id
                    }
                }
            }, (err, result) => {

                user.updateOne({ _id: userFound._id }, {
                    $pull: {
                        friends: {
                            _id: _id
                        }
                    }
                }, (err, result => {
                    if (!err)
                        res.json({
                            status: "Rejected",
                            message: "Request has been rejected"
                        })
                    else
                        res.json({
                            status: "error",
                            message: "Sorry some error occured please try again later"
                        })
                }))
            })
        }
    })



module.exports = router