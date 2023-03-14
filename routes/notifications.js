const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const {auth} = require('../auth')
const {baseURL} = require('../auth')
const {formatDate} = require('../formatDate')
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
    .get(auth, async(req,res)=>{
        const userFound = await user.findOne({accessToken:req.accessToken})
        userFound.notifications = formatDate(userFound.notifications)
        res.render('notifications', {notifications:userFound.notifications, baseURL})
    })

module.exports = router