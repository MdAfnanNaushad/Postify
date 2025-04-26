const multer = require('multer'); //multer is a middleware primarily used for uploading files like purpose
const path = require('path');
const crypto = require('crypto')
const fs = require('fs')
const uploadDir = './public/images/uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
//diskStorage
const storage = multer.diskStorage({ //Defing the files to where to store
  destination: function (req, file, cb) {
    cb(null, uploadDir) //path of storing the file
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, function (err, name) { //generting the name
      if (err) return cb(err);
      let fn = name.toString("hex") + path.extname(file.originalname) //converting the name to hexadecimal string extname is a method used to ectract the extension of the file name
      cb(null, fn);
    })

  }
})

const upload = multer({ storage: storage }) //storing all the thing in upload variable so the it can be used in app.js as a requirement

//export upload variable
module.exports = upload; //exports sre used to use this file in the app.js