const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  id: { type: String },
  reason: { type: String },
  images: { type: Array },
  date: { type: Number },
  blockedBy: { type: String },
});

module.exports = mongoose.model("blocks", Schema);
