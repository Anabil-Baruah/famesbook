const router = require('express').Router();
const mongoose = require('mongoose');
const user = require('../models/users')
const post = require('../models/posts')
const group = require('../models/groups')
const page = require('../models/pages')
const {auth} = require('../auth')
const path = require('path');
const crypto = require('crypto');
const { GridFsStorage } = require('multer-gridfs-storage');
// const methodOverride = require('method-override');
const Grid = require('gridfs-stream');
const multer = require('multer');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId

let gfs, gridfsBucket

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
    .get(auth, (req, res)=>{
        res.render('create')
    })
    
router.route('/createPage')
    .post(auth, upload.single('coverPhoto'), async(req,res)=>{
        var name = req.body.name;
        var domainName = req.body.domainName;
        var additionalInfo = req.body.additionalInfo;
        var coverPhoto = req.filename;
        console.log(req.filename)
        console.log(req.coverPhoto)

        const userFound = await user.findOne({ accessToken: req.accessToken });
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            });
        } else {
                const newPage = new page({
                    name,
                    domainName,
                    additionalInfo,
                    coverPhoto,
                    members: [{
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }],
                    owner: {
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }
                })
           
                const isCreated = await newPage.save()
                if(isCreated){ 
                     await user.updateOne({ accessToken:req.accessToken }, {
                        $push: {
                            pages: {
                                _id:newPage._id,
                                name:newPage.name,
                                coverPhoto:newPage.coverPhoto
                            }
                        }
                    })
                    res.redirect('/create')
                }
                else
                    res.json({
                        status:"failure"
                    })
                
                // res.json({
                //     status: "error",
                //     message: "Please select a photo"
                // })
            
        }
    })
router.route('/createGroup')
    .post(auth, upload.single('coverPhoto'), async(req,res)=>{
        var name = req.body.name;
        var additionalInfo = req.body.additionalInfo;
        var coverPhoto = req.filename;
       
        const userFound = await user.findOne({ accessToken: req.accessToken });
        if (userFound == null) {
            res.json({
                "status": "error",
                "message": "User has been logged out"
            });
        } else {
                const newGroup = new group({
                    name,
                    additionalInfo,
                    coverPhoto,
                    members: [
                        {
                            _id: userFound._id,
                            name: userFound.name,
                            profileImage: userFound.profileImage,
                            status:"Accepted"
                        }
                    ],
                    owner: {
                        _id: userFound._id,
                        name: userFound.name,
                        profileImage: userFound.profileImage
                    }
                })
           
                const isCreated = await newGroup.save()
                console.log(isCreated)
                if(isCreated){
                    await user.updateOne({ accessToken:req.accessToken }, {
                        $push: {
                            groups: {
                                _id:newGroup._id,
                                name:newGroup.name,
                                coverPhoto:newGroup.coverPhoto,
                                status:"Accepted"
                            }
                        }
                    })
                   
                    res.redirect('/create')
            }
                else
                    res.json({
                        status:"failure"
                    })
                // res.json({
                //     status: "error",
                //     message: "Please select a photo"
                // })
            
        }
    })

module.exports = router