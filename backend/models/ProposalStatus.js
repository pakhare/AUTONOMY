const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  proposalId:   { type: String, required: true, unique: true },
  fileUrl:      { type: String, required: true },
  creator:      { type: String, required: true },
  timestamp:    { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProposalStatus", schema);
