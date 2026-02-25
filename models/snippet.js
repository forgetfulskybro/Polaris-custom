const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  keyword: { type: String },
  content: { type: String },
  created: { type: Date, default: Date.now },
  id: { type: String, required: true },
});

module.exports = mongoose.model("snippets", Schema);
