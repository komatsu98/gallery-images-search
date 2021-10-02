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
const Images = require('./models/Images')

const { settings, mongoURL } = require('./config')
const { } = require('./helpers/utils')

let dbConnect = require('./db/connection')
dbConnect.connect(mongoURL)

const app = express();
const server = http.createServer(app);
app.use(express.static(__dirname + '/'));

// ROUTES
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// SET STORAGE
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

function checkFileType(file, cb) {
  const filetypes = /\.(jpg|JPG|jpeg|JPEG|png|PNG)/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith("image");

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PNG, JPG, JPEG files Only!');
  }
}

var upload = multer({
  storage: storage,
  limits: {
    // fields: 5,
    // fieldNameSize: 50, // TODO: Check if this size is enough
    // fieldSize: 20000, //TODO: Check if this size is enough
    fileSize: 1500000, // 150 KB 
  },
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  }
})

const uploadFiles = upload.array("images", 10); // limit to 10 images

const uploadImages = (req, res, next) => {
  uploadFiles(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.send("Too many files to upload.");
      }
    } else if (err) {
      return res.send(err);
    }

    next();
  });
};


const searchImages = async (req, res, next) => {
  if (!req.body && !req.files) return next();
  req.body.images = [];
  console.log("searchImages", req.body.name, req.files.length)

  if (req.body.name) {
    let imgsByName = await Images.find({ name: { $regex: req.body.name, $options: 'i' } })
    req.body.images = imgsByName
  }
  await Promise.all(
    req.files.map(async file => {
      console.log('successfully uploaded ' + file.path);
      const edinburgh_original = await Jimp.read(file.path);
      const binary = edinburgh_original.hash(2)
      let check = await Images.find({ binary: binary }, 'name location');
      check.forEach(c => {
        req.body.images.push(c)
      })
      fs.unlink(file.path, (err) => {
        if (err) console.log(err)
        else console.log('successfully deleted ' + file.path);
      });
    })
  );

  next();
};

const storeImages = async (req, res, next) => {
  if (!req.body || !req.files || !req.body.name || !req.files.length) return next();
  req.body.images = [];
  console.log("storeImages", req.body.name, req.files.length)
  const name = req.body.name.trim();
  if (!name) return next();
  await Promise.all(
    req.files.map(async file => {
      console.log('successfully uploaded ' + file.path);
      const edinburgh_original = await Jimp.read(file.path);
      const binary = edinburgh_original.hash(2)
      let check = await Images.countDocuments({ name: name, binary: binary });
      if (check) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err)
          else console.log('successfully deleted ' + file.path);
        });
      } else {
        Images.create({ name: name, binary: binary, location: file.path })
        req.body.images.push({ name: name, location: file.path })
      }
    })
  );

  next();
};

const getResult = async (req, res) => {
  if (!req.body || !req.body.images || req.body.images.length <= 0) {
    return res.send([]);
  }

  return res.send(req.body.images);
};

// app.route("search").post(uploadImages, searchImages, getResult)
app.post('/search', uploadImages, searchImages, getResult)

app.post('/store', uploadImages, storeImages, getResult)

// app.post('/x', function (req, res) {
//   res.send('POST request to the homepage')
// })
server.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});