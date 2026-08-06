/**
 * models/Post.js
 * ---------------
 * An interview experience post. Can be marked anonymous (author's identity
 * hidden from other users, but still tracked internally for moderation and
 * karma purposes). Tagged by company + role for easy filtering — the core
 * unique feature that separates this from a generic forum/blog app.
 */

const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, default: false },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    // "referral_request" lets someone ask for a referral tied to this experience,
    // separate from a plain experience share.
    postType: { type: String, enum: ["experience", "referral_request"], default: "experience" },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, required: true, maxlength: 5000 },
    tags: [{ type: String, trim: true, lowercase: true }],
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Common filter pattern: searching by company is the primary use case.
postSchema.index({ company: 1, createdAt: -1 });

postSchema.methods.toPublicJSON = function (currentUserId = null) {
  const obj = this.toObject();
  obj.upvoteCount = obj.upvotes.length;
  obj.hasUpvoted = currentUserId
    ? obj.upvotes.some((id) => id.toString() === currentUserId.toString())
    : false;
  delete obj.upvotes;

  if (obj.isAnonymous) {
    obj.author = { username: "Anonymous", _id: null };
  }
  return obj;
};

module.exports = mongoose.model("Post", postSchema);
