/**
 * middleware/rateLimiters.js
 * ----------------------------
 * SECURITY: Without rate limiting, /login and /register can be brute-forced
 * (an attacker can try thousands of password guesses per minute against a
 * known email) or abused to mass-create fake accounts. express-rate-limit
 * is free and requires no external service.
 */

const rateLimit = require("express-rate-limit");

// Strict limit on login attempts — the highest-value brute-force target.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// Looser limit on registration — still prevents mass fake-account creation.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this IP. Please try again later." },
});

// General API limiter applied globally as a baseline defense against abuse/scraping.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // generous, since this covers all normal browsing/reading traffic too
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

module.exports = { loginLimiter, registerLimiter, generalLimiter };
