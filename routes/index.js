const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const redis = require('redis')
const { auth } = require('../auth')
const { baseURL } = require('../auth')
const cloudinary = require('../fileUpload')
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId
const { formatDate } = require('../formatDate')
require('dotenv').config()



//create storage engine


router.route('/')
    .get(auth, async (req, res) => {
        
        const accessToken = req.accessToken
        const userFound = await user.findOne({ accessToken });
        if (userFound) {
            var ids = [];
            ids.push(userFound._id);
            // for (var a = 0; a < userFound.pages.length; a++) {
            //     ids.push(userFound.pages[a]._id)
            // }
            // for (var a = 0; a < userFound.groups.length; a++) {
            //     if (user.groups[a].status == "Accepted") {
            //         ids.push(userFound.groups[a]._id);
            //     }
            // }
            for (var a = 0; a < userFound.friends.length; a++) {
                ids.push(userFound.friends[a]._id);
            }

            ids.reverse()
            var posts = await post.find({
                "owner._id": {
                    $in: ids
                }
            })
            posts = formatDate(posts)

            // const suggestions = await user.find({ $and: [{ _id: { "$ne": userFound._id } }, { friends: { $not: { $elemMatch: { _id: userFound._id } } } }] })
            // console.log(suggestions)
            const suggestions = await user.aggregate([

                { $match: { _id: { $ne: userFound._id } } },

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

            res.render('index', { user: userFound, posts: posts, suggestions, baseURL })
        }
        else {
            // res.send('user not found')
            res.redirect(`${baseURL}/login`)
        }

        //res.send("sorry error occured")


    })


router.route('/toggleLikePost')
    .post(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        const _id = req.body._id;
        if (userFound == null)
            return res.json({ "status": "error", "message": "User has been logged out" })




        const postFound = await post.findOne({ _id });

        if (postFound == null) {
            res.json({
                "status": "error",
                "message": "Post does not exist"
            });
        } else {

            var isLiked = false;
            for (var a = 0; a < postFound.likers.length; a++) {
                var liker = postFound.likers[a];

                if (liker._id.toString() == userFound._id.toString()) {
                    isLiked = true;
                    break;
                }
            }
            if (isLiked) {
                post.updateOne({ _id }, {
                    $pull: {
                        "likers": {
                            "_id": userFound._id
                        }
                    }
                }, (err, data) => {
                    res.json({
                        "status": "unliked",
                        "message": "Post has been unliked"
                    })
                })
            } else {
                user.updateOne({ "_id": postFound.owner._id }, {
                    $push: {
                        "notifications": {
                            "_id": userFound._id,
                            "type": "photo_liked",
                            "content": userFound.name + " has liked your post.",
                            "profilePhoto": userFound.profilePhoto,
                            "createdAt": new Date().getTime()
                        }
                    }
                });
                post.updateOne({ _id }, {
                    $push: {
                        "likers": {
                            "_id": userFound._id,
                            "name": userFound.name,
                            "profilePhoto": userFound.profilePhoto
                        }
                    }
                }, (err, data) => {
                    res.json({
                        "status": "liked",
                        "message": "Post has been liked"
                    })
                })
            }
        }

    })


router.route('/addPost')
    .post(auth, async (req, res) => {

        const userFound = await user.findOne({ accessToken: req.accessToken })
        const isSharedPost = req.body.isSharedPost
        const postFound = await post.findOne({ _id: isSharedPost })
        console.log(isSharedPost, "sharedPost")
        var newPost = {}
        if (isSharedPost !== undefined) {
            newPost = new post({
                caption: req.body.caption,
                isShared: true,
                type: "sharedPost",
                owner: {
                    _id: userFound._id,
                    name: userFound.username,
                    profileImage: userFound.profilePhoto
                },
                sharedPost: {
                    _id: postFound._id,
                    caption: postFound.caption,
                    contentType: postFound.contentType,
                    fileURL: postFound.fileURL,
                    type: postFound.type,
                    createdAt: postFound.createdAt,
                    owner: {
                        _id: postFound.owner._id,
                        name: postFound.owner.name,
                        profileImage: postFound.owner.profileImage
                    }
                }
            })

        } else {

            if (req.body.fileType !== undefined) {
                cloudinary.uploader.upload(`data:${req.body.fileType};base64,${req.body.base64String}`, {
                    resource_type: 'raw',
                    folder: 'famesbook',
                    width: 1000,
                    height: 600
                    // crop: "scale"
                }).then(async (result) => {
                    newPost = new post({
                        caption: req.body.caption,
                        contentType: req.body.fileType,
                        type: req.body.fileType,
                        fileURL: result.url,
                        createdAt: new Date().getTime(),
                        owner: {
                            _id: userFound._id,
                            name: userFound.username,
                            profileImage: userFound.profilePhoto
                        }
                    })
                    console.log(result)
                    const postUpload = await newPost.save()
                    const updateUserPosts = await user.updateOne({ accessToken: req.accessToken }, {
                        $push: {
                            posts: {
                                _id: newPost._id
                            }
                        }
                    })

                    if (postUpload && updateUserPosts) {
                        return res.json({
                            "status": "success",
                            "message": "Post has been uploaded"
                        })
                    }
                }).catch(() => {
                    console.log("error occured")
                    return res.json({
                        "status": "error",
                        "message": "File is too large"
                    })
                })
            } else {
                newPost = new post({
                    caption: req.body.caption,
                    contentType: "text",
                    type: "text",
                    createdAt: new Date().getTime(),
                    owner: {
                        _id: userFound._id,
                        name: userFound.username,
                        profileImage: userFound.profilePhoto
                    }
                })
                const postUpload = await newPost.save()
                const updateUserPosts = await user.updateOne({ accessToken: req.accessToken }, {
                    $push: {
                        posts: {
                            _id: newPost._id
                        }
                    }
                })
                if (postUpload && updateUserPosts) {
                    return res.json({
                        "status": "success",
                        "message": "Post has been uploaded"
                    })
                }
            }
        }

    })

router.route('/previewSharePost')
    .post(auth, async (req, res) => {
        const _id = req.body._id;

        const accessToken = req.accessToken;

        if (accessToken == null) {
            return res.json({
                "status": "error",
                "message": "user has been logged out"
            })
        } else {
            const postFound = await post.findOne({ _id });
            if (postFound !== null) {
                res.json({
                    "status": "success",
                    "message": "Do you wanna share this post ?",
                    post: postFound
                })
            } else {
                res.json({
                    "status": "error",
                    "message": "Post not found"
                })
            }
        }
    })


router.route('/addComment')
    .post(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken });

        const newComment = await post.updateOne({ _id: req.body._id }, {
            $push: {
                "comments": {
                    _id: new ObjectId(),
                    user: {
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profilePhoto
                    },
                    Comment: req.body.comment,
                    createdAt: new Date().getTime(),
                    replies: []
                }
            }
        })
        if (newComment)
            res.redirect(`${baseURL}`)

    })




module.exports = router