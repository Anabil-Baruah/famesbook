const mongoose = require('mongoose');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId

const userSchema = mongoose.Schema({
    name:String,
    domainName:String,
    additionalInfo:String,
    coverPhoto:String,
    members:[{
        _id:ObjectId,
        name:String,
        profileImage:String
    }],
    owner:{
        _id:ObjectId,
        name:String,
        profileImage:String
    }
})

module.exports = mongoose.model('page', userSchema)