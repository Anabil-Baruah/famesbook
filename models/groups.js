const mongoose = require('mongoose');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId

const userSchema = mongoose.Schema({
    name:String,
    additionalInfo:String,
    coverPhoto:String,
    members:[{
        _id:ObjectId,
        name:String,
        profileImage:String,
        status:String
    }],
    owner:{
        _id:ObjectId,
        name:String,
        profileImage:String,
        createdAt:{
            type:String,
            default:Date.now
        }
    }
})

module.exports = mongoose.model('group', userSchema)