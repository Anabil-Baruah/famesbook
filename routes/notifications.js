const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const {auth} = require('../auth')
const {baseURL} = require('../auth')
const {formatDate} = require('../formatDate')

const mongodb = require('mongodb');




router.route('/')
    .get(auth, async(req,res)=>{
        const userFound = await user.findOne({accessToken:req.accessToken})
        userFound.notifications = formatDate(userFound.notifications)
        res.render('notifications', {notifications:userFound.notifications, baseURL})
    })

module.exports = router