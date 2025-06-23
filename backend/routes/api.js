const express = require("express");
const AWS = require("aws-sdk");
const ProposalStatus = require("../models/ProposalStatus");
const router = express.Router();
require("dotenv").config();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Signed URL endpoint
router.post("/sign-s3-url", async (req, res) => {
  const { filename, fileType } = req.body;
  const Key = `proposal-uploads/${Date.now()}-${filename}`;

  try {
    const signedUrl = await s3.getSignedUrlPromise("putObject", {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key,
      Expires: 60,
      ContentType: fileType,
      // ACL: "public-read",
    });
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
    return res.json({ signedUrl, fileUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Signed URL failed" });
  }
});

// Save metadata
router.post("/save-status", async (req, res) => {
  const { proposalId, fileUrl, creator } = req.body;
  if (!proposalId || !fileUrl || !creator) return res.status(400).json({ error: "Missing fields" });

  try {
    const existing = await ProposalStatus.findOne({ proposalId });
    if (existing && existing.creator !== creator) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await ProposalStatus.findOneAndUpdate(
      { proposalId },
      { proposalId, fileUrl, creator, timestamp: Date.now() },
      { upsert: true, new: true }
    );
    return res.json({ message: "Saved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "DB error" });
  }
});

// Fetch for frontend
router.get("/status/:proposalId", async (req, res) => {
  try {
    const doc = await ProposalStatus.findOne({ proposalId: req.params.proposalId });
    return doc ? res.json(doc) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "DB error" });
  }
});

module.exports = router;