const router = require('express').Router();
const {auth} = require('../auth')
const user = require('../models/users')
const post = require('../models/posts')
const page = require('../models/pages')
const group = require('../models/groups')
const { ObjectId } = require('mongodb')

router.route('/')
    .get(auth, async (req, res) => {
        const userFound = await user.findOne({ accessToken: req.accessToken })
        res.render('search', { users: "", groups: "", pages: "", user: userFound })
    })

router.route('/:query')
    .get(auth, async (req, res) => {
        var query = req.params.query;
        const userFound = await user.findOne({ accessToken: req.accessToken })
        const users = await user.find({
            $and: [{
                "name": {
                    $regex: ".*" + query + ".*",
                    $options: "i",

                }
            }, {
                "accessToken": {
                    $ne: userFound.accessToken       //to filter your own name
                }
            }]
        })
        const pages = await page.find({
            "name": {
                $regex: ".*" + query + ".*",
                $options: "i"
            }
        })
        const groups = await group.find({
            "name": {
                $regex: ".*" + query + ".*",
                $options: "i"
            }
        })
        // console.log(users)

        res.render("search", { users, groups, pages, user: userFound })
    })




router.route('/image/:filename')
    .get((req, res) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0)
                return res.status(404).json({
                    err: "No files exist"
                })
            //check if image
            if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
                const readstream = gridfsBucket.openDownloadStreamByName(file.filename);
                readstream.pipe(res)
            } else {
                res.status(404).json({ err: "Not an image" })
            }
        })
    })


module.exports = router