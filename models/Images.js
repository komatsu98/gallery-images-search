const mongoose = require("mongoose")
// create a schema
const schema = new mongoose.Schema({
    name: String,
    location: String,
    binary: String
});

schema.index({ name: 1 });
schema.index({ binary: 1 });

module.exports = mongoose.model('Images', schema);