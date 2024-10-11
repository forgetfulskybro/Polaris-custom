const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  code: { type: String },
  user: { type: String },
});

module.exports = mongoose.model("captcha", Schema);
