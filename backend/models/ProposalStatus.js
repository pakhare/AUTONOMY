const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  proposalId:   { type: String, required: true, unique: true },
  fileUrl:      { type: String, required: true },
  creator:      { type: String, required: true },
  timestamp:    { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProposalStatus", schema);



// const mongoose = require("mongoose");

// const UploadSchema = new mongoose.Schema({
//   fileUrl: String,
//   note: String,
//   timestamp: { type: Date, default: Date.now },
//   statusTag: String,
// });

// const ProposalStatusSchema = new mongoose.Schema({
//   proposalId: String,
//   creator: String,
//   uploads: [UploadSchema],
// });

// module.exports = mongoose.model("ProposalStatus", ProposalStatusSchema);
