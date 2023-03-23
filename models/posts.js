const mongoose = require('mongoose');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId

const userSchema = mongoose.Schema({
    caption: String,

    isShared: {
        type: Boolean,
        default: false
    },

    fileURL: String,

    contentType: {
        type: String,
        default: "text"
    },
    type: { type: String },

    createdAt: {
        type: String,
        default: Date.now
    },
    likers: [{
        _id: ObjectId,
        name: String,
        profilePhoto: String
    }],
    comments: [{
        _id: ObjectId,
        user: {
            _id: ObjectId,
            name: String,
            profileImage: String
        },
        Comment: String,
        createdAt: { type: String, default: Date.now },
        replies: [{
            user: {
                _id: ObjectId,
                name: String
            },
            reply: String
        }]
    }],
    shares: [{
        type: String
    }],
    owner: {
        _id: ObjectId,
        name: String,
        profileImage: String,
    },
    sharedPost: {
        _id: ObjectId,

        caption: String,

        filename: String,

        type: { type: String },  //remember type is a reserver key word so if u wanna use it as a field inside an object u have to write it like this

        contentType: String,

        createdAt: String,

        owner: {
            _id: ObjectId,
            name: String,
            profileImage: String,
        }
    }
})
module.exports = mongoose.model('post', userSchema)