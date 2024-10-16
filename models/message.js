const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  thread: { type: Number },
  message: { type: Number },
  recipient: { type: String },
  channel: { type: String },
  content: { type: String },
  author: { type: String },
  attachments: { type: Array },
  timestamp: { type: Number },
});

module.exports = mongoose.model("messages", Schema);
