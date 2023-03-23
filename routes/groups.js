const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const { auth } = require('../auth')
const { baseURL } = require('../auth')

const mongodb = require('mongodb');
const group = require('../models/groups');
const ObjectId = mongodb.ObjectId



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

        res.render('viewGroup', { group: groupFound, user: userFound, userAccepted, isJoin, baseURL })
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
                    }, async (err, data) => {
                        await user.updateOne({ _id: groupFound.owner._id }, {
                            $pull: {
                                notifications: {
                                    userId: userFound._id,
                                }
                            }
                        });
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

router.route('/rejectRequestJoinGroup')
    .post(auth, async (req, res) => {
        const senderId = req.body.sender_id
        const groupId = req.body.group_id
        const accessToken = req.accessToken
        const userFound = await user.findOne({ accessToken })

        if (userFound === null) {
            return res.json({
                status: "error",
                message: "User logged out"
            })
        }

        group.updateOne({ _id: groupId }, {
            $pull: {
                "members": {
                    "_id": userFound._id
                }
            }
        }, async (err, result) => {
            if (!err) {
                await user.updateOne({ _id: senderId }, {
                    $pull: {
                        groups: {
                            "_id": groupId
                        }
                    }
                })
                user.updateOne({ accessToken },
                    { $set: { 'notifications.$[elem].status': '' } },
                    { arrayFilters: [{ 'elem.userId': senderId, 'elem.type': "group_join_request" }] },
                    function (error, result) {
                        if (error) {
                            return res.json({
                                status: "error",
                                message: "some errorr occured"
                            })
                        } else {
                            console.log(result);
                            return res.json({
                                status: "success",
                                message: "Action recorded succesfully"
                            })
                        }
                    }
                )
            }

        })

    })


router.route('/acceptRequestJoinGroup')
    .post(auth, async (req, res) => {
        const senderId = req.body.sender_id
        const groupId = req.body.group_id
        const accessToken = req.accessToken
        const userFound = await user.findOne({ accessToken })

        if (userFound === null) {
            return res.json({
                status: "error",
                message: "User logged out"
            })
        }

        group.updateOne({ _id: groupId },
            { $set: { 'members.$[elem].status': 'Accepted' } },
            { arrayFilters: [{ 'elem._id': senderId }] },
            (err, result) => {
                if (!err) {
                    return res.json({
                        status: "success",
                        message: "Action recorded succesfully"
                    })
                }

            })
    })



module.exports = router