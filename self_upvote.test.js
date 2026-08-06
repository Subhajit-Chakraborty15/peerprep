const mongoose = require("mongoose");

// Mock the Post model before requiring the router that uses it.
jest.mock("../models/Post");
jest.mock("../models/User");

process.env.JWT_SECRET = "test_secret_for_unit_tests_only";

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const Post = require("../models/Post");
const postsRouter = require("../routes/posts");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/posts", postsRouter);
  return app;
}

describe("Self-upvote prevention", () => {
  test("author cannot upvote their own post", async () => {
    const app = buildApp();
    const authorId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ userId: authorId.toString() }, process.env.JWT_SECRET);

    Post.findById.mockResolvedValue({
      _id: "post123",
      author: authorId, // same as the requesting user
      upvotes: [],
    });

    const res = await request(app)
      .post("/api/posts/post123/upvote")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/can't upvote your own post/i);
  });

  test("a different user CAN upvote someone else's post", async () => {
    const app = buildApp();
    const authorId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ userId: otherUserId.toString() }, process.env.JWT_SECRET);

    const mockPost = {
      _id: "post456",
      author: authorId,
      upvotes: [],
      isAnonymous: false,
      save: jest.fn().mockResolvedValue(true),
      toPublicJSON: jest.fn().mockReturnValue({ upvoteCount: 1, hasUpvoted: true }),
    };
    Post.findById.mockResolvedValue(mockPost);

    const { requireAuth } = require("../middleware/auth");

    const res = await request(app)
      .post("/api/posts/post456/upvote")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPost.upvotes.length).toBe(1);
  });
});
