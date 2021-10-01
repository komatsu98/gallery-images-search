// call all the required packages
const express = require('express')
const multer = require('multer');
const http = require('http')
const port = 3000, hostname = "127.0.0.1";
const path = require('path')
const fs = require('fs')
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const Jimp = require("jimp");

const { settings } = require('./config')
const { } = require('./helpers/utils')

const app = express();
const server = http.createServer(app);

// ROUTES
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// SET STORAGE
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

var upload = multer({
  storage: storage,
  limits: {
    // fields: 5,
    // fieldNameSize: 50, // TODO: Check if this size is enough
    // fieldSize: 20000, //TODO: Check if this size is enough
    // fileSize: 15000000, // 150 KB 
  },
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  }
})

function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /.png|.jpg|.jpeg/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PNG, JPEG files Only!');
  }
}

const uploadFiles = upload.array("images", 10); // limit to 10 images

const uploadImages = (req, res, next) => {
  uploadFiles(req, res, err => {
    if (err instanceof multer.MulterError) { // A Multer error occurred when uploading.
      if (err.code === "LIMIT_UNEXPECTED_FILE") { // Too many images exceeding the allowed limit
        // ...
      }
    } else if (err) {
      // handle other errors
      console.log(err)
    }

    // Everything is ok.
    const files = req.files
    if (!files) {
      const error = new Error('Please upload a file')
      error.httpStatusCode = 400
      return next(error)
    }
    files.forEach(async file => {
      const edinburgh_original = await Jimp.read(file.path);
      console.log(edinburgh_original)
    })
    
    next();
  });
};

const searchImages = async (req, res, next) => {
  if (!req.files) return next();

  req.body.images = [];
  await Promise.all(
    req.files.map(async file => {
      const newFilename = file.name;

      await sharp(file.buffer)
        .resize(640, 320)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`upload/${newFilename}`);

      req.body.images.push(newFilename);
    })
  );

  next();
};

const getResult = async (req, res) => {
  if (req.body.images.length <= 0) {
    return res.send(`You must select at least 1 image.`);
  }

  const images = req.body.images
    .map(image => "" + image + "")
    .join("");

  return res.send(`Images were uploaded:${images}`);
};

app.post('/search', uploadImages, searchImages, getResult)

app.post('/store', uploadImages, getResult)

app.post('/x', function (req, res) {
  res.send('POST request to the homepage')
})
server.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});