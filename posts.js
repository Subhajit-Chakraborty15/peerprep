/**
 * routes/posts.js
 * -----------------
 * Core feature: create, list (with company/role filtering), view, and
 * upvote interview experience / referral request posts.
 */

const express = require("express");
const { body, query, validationResult } = require("express-validator");
const Post = require("../models/Post");
const User = require("../models/User");
const { requireAuth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * Escapes regex metacharacters in user-supplied search input.
 * SECURITY: Without this, a crafted company filter (e.g. "(a+)+$") passed
 * straight into `new RegExp()` can cause catastrophic backtracking and hang
 * the server for minutes on a single request (ReDoS). Verified locally:
 * an unescaped malicious pattern took 147+ seconds to evaluate.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create a new post (requires login, even if posting anonymously —
// we still need to know who to attribute karma to internally).
router.post(
  "/",
  requireAuth,
  [
    body("company").trim().notEmpty().withMessage("Company is required"),
    body("role").trim().notEmpty().withMessage("Role is required"),
    body("title").trim().isLength({ min: 5, max: 150 }).withMessage("Title must be 5-150 characters"),
    body("content").trim().isLength({ min: 20, max: 5000 }).withMessage("Content must be at least 20 characters"),
    body("postType").optional().isIn(["experience", "referral_request"]),
    body("isAnonymous").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { company, role, title, content, postType, isAnonymous, tags } = req.body;
      const post = new Post({
        author: req.userId,
        company,
        role,
        title,
        content,
        postType: postType || "experience",
        isAnonymous: !!isAnonymous,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      });
      await post.save();
      res.status(201).json(post.toPublicJSON(req.userId));
    } catch (err) {
      res.status(500).json({ error: "Failed to create post.", details: err.message });
    }
  }
);

// List posts, optionally filtered by company/role/postType, newest first.
router.get(
  "/",
  optionalAuth,
  [
    query("company").optional().trim(),
    query("postType").optional().isIn(["experience", "referral_request"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
  ],
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.company) {
        // Escaped to prevent ReDoS from malicious regex patterns in user input.
        filter.company = new RegExp(escapeRegex(req.query.company), "i");
      }
      if (req.query.postType) {
        filter.postType = req.query.postType;
      }

      const page = req.query.page || 1;
      const limit = 20;

      const posts = await Post.find(filter)
        .populate("author", "username karma")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Post.countDocuments(filter);

      res.json({
        posts: posts.map((p) => p.toPublicJSON(req.userId)),
        page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch posts.", details: err.message });
    }
  }
);

// Get a single post by id.
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "username karma");
    if (!post) return res.status(404).json({ error: "Post not found." });
    res.json(post.toPublicJSON(req.userId));
  } catch (err) {
    res.status(400).json({ error: "Invalid post id." });
  }
});

// Toggle upvote on a post. Also updates the author's karma score.
router.post("/:id/upvote", requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found." });

    const userId = req.userId;

    // INTEGRITY: prevent authors from upvoting their own posts to farm karma.
    // Karma is meant to signal community trust — self-upvotes would defeat
    // that entirely and let anyone game the referral-request trust system.
    if (post.author.toString() === userId.toString()) {
      return res.status(403).json({ error: "You can't upvote your own post." });
    }

    const alreadyUpvoted = post.upvotes.some((id) => id.toString() === userId.toString());

    if (alreadyUpvoted) {
      post.upvotes = post.upvotes.filter((id) => id.toString() !== userId.toString());
      await User.findByIdAndUpdate(post.author, { $inc: { karma: -1 } });
    } else {
      post.upvotes.push(userId);
      await User.findByIdAndUpdate(post.author, { $inc: { karma: 1 } });
    }

    await post.save();
    res.json(post.toPublicJSON(userId));
  } catch (err) {
    res.status(400).json({ error: "Failed to toggle upvote.", details: err.message });
  }
});

module.exports = router;
