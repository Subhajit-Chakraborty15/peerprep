/**
 * server.js
 * ----------
 * Entry point for the PeerPrep API.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimiters");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");

const app = express();

// SECURITY: sets a range of protective HTTP headers (X-Content-Type-Options,
// X-Frame-Options, HSTS, etc.) — free, zero-config baseline hardening.
app.use(helmet());

// SECURITY: restrict CORS to known frontend origins in production. Falls
// back to allowing localhost dev servers when CORS_ORIGIN isn't set, so
// local development still works out of the box.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// SECURITY: cap request body size to prevent large-payload abuse.
app.use(express.json({ limit: "10kb" }));

// SECURITY: strips any keys starting with "$" or containing "." from
// req.body/req.query/req.params — prevents NoSQL injection attempts like
// {"email": {"$gt": ""}} from reaching Mongoose queries.
app.use(mongoSanitize());

// SECURITY: baseline rate limit across all routes, on top of the stricter
// limits applied specifically to /login and /register.
app.use(generalLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/posts/:postId/comments", commentRoutes);

// Generic error handler (catches anything not handled in individual routes)
app.use((err, req, res, next) => {
  // Body-parser throws this specific error type for oversized payloads —
  // surface it as a proper 413 instead of a generic 500.
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large." });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

// Only auto-connect to MongoDB and start listening when this file is run
// directly (e.g. `node server.js`). When imported by test files, we just
// want the configured `app` object — connecting to a real DB or calling
// process.exit() on failure would break the test run.
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`PeerPrep API running on port ${PORT}`));
  });
}

module.exports = app; // exported for testing
