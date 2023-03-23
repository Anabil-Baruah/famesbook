const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    coverPhoto: {type:String, default:""},

    profilePhoto: {type:String, default:""},

    dob: String,

    city: String,

    country: String,

    aboutMe: String,

    friends: [{
        _id: ObjectId,
        name: String,
        profilePhoto: String,
        status: {
            type: String,
            default: "pending"
        }
    }],
    pages: [{
        _id: ObjectId,
        name: String,
        coverPhoto: String
    }],
    notifications: [{
        _id: ObjectId,
        type: {type:String, required:true},
        name: String,
        profilePhoto: String,
        createdAt: { type: String, default: Date.now },
        content: String,
        groupId: ObjectId,
        userId: ObjectId,
        status: { type: String, default: "Pending" },
    }],
    groups: [{
        _id: ObjectId,
        name: String,
        coverPhoto: String,
    }],
    posts: [{
        _id: ObjectId
    }],
    accessToken: {
        type: String
    }
})
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

userSchema.methods.generateAuthToken = async function () {
    try {
        const token = await jwt.sign({ _id: this._id }, "himanmynameisanabilbaruahandimlearningmernstack")
        this.accessToken = token
        await this.save();
        return token;
    }
    catch (error) {
        console.log(error);
    }
}

module.exports = mongoose.model('user', userSchema)