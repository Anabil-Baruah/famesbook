const router = require('express').Router();
const { auth } = require('../auth')
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



module.exports = router