const cloudinary = require('cloudinary').v2
require('dotenv').config()

cloudinary.config({
    cloud_name: 'dudvqptv0',
    api_key: '841155743558353',
    api_secret: 'gYYk_vGQEt1fnogL4J-zoNIQn4g'
});

module.exports = cloudinary