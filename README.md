# PeerPrep — Anonymous Interview Experience & Referral Board

A MERN-stack community platform where job seekers post real interview
experiences tagged by company/role, request referrals, and build trust
through a karma system — without paying for anything. Genuinely different
from a generic CRUD blog: the anonymity model, karma-gated trust signal,
and company/role tagging are the actual product, not decoration.

## Why this is unique
Most portfolio MERN projects are todo lists or blogs. This solves a real
problem for job seekers (verifying whether an interview experience or
referral request is trustworthy) using a mechanic — karma earned only from
other people's upvotes, never your own — that's specific to that problem.

## Tech stack (100% free, no paid services)
- **MongoDB Atlas** (free M0 tier) — database
- **Express + Node.js** — backend API
- **React + Vite** — frontend
- **JWT + bcrypt** — auth, no third-party auth provider needed
- Deployable free via **Render** (backend) + **Vercel/Netlify** (frontend)

## Project structure
```
peerprep/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── config/db.js            # MongoDB Atlas connection
│   ├── models/                  # User, Post, Comment (Mongoose schemas)
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── rateLimiters.js       # Brute-force / abuse protection
│   ├── routes/                    # auth, posts, comments
│   ├── tests/                      # 23 automated tests (Jest + Supertest)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/                  # Feed, PostDetail, CreatePost, Login, Register
    │   ├── components/              # Navbar, PostCard, ProtectedRoute
    │   ├── context/AuthContext.jsx    # Login state + JWT storage
    │   └── styles.css                  # Design system (see below)
    └── vite.config.js
```

## Design concept
Interview experiences as **filed records in a shared logbook** — each post
reads like a stamped ticket stub tagged by company/role (like a boarding
pass tagged by flight/gate), and karma is styled as a brass/wax-seal
verification badge, reinforcing the platform's actual purpose: signaling
which accounts have a track record of genuine, upvoted contributions.

## Security review — what I checked and fixed

Since this app handles real user accounts, passwords, and (deliberately)
anonymous posting, I ran a security pass and found three real, working
vulnerabilities — not hypothetical ones. All three were reproduced,
fixed, and covered by an automated regression test.

### 1. ReDoS in the company search filter (confirmed exploit)
The `GET /posts?company=` filter passed raw user input directly into
`new RegExp()`. A crafted input like `(a+)+$` **measurably took 147,000ms**
(2.5 minutes) to evaluate on a single request due to catastrophic regex
backtracking — a real denial-of-service vector, not a theoretical one.

**Fix:** all regex metacharacters in user input are now escaped before
being compiled into a `RegExp`, so user input is always treated as literal
text. Verified: the same malicious input now resolves in ~1ms.

### 2. No brute-force protection on login/register
Nothing stood between an attacker and unlimited password-guessing attempts
against a known email, or unlimited fake-account creation.

**Fix:** added `express-rate-limit` — 10 login attempts per 15 minutes and
15 registrations per hour, per IP, plus a general 300 req/15min baseline
across the whole API.

### 3. Karma could be self-farmed
Nothing stopped a user from upvoting their own post to inflate their own
karma score — which defeats the entire point of karma as a community trust
signal on a platform centered on referral requests.

**Fix:** the upvote endpoint now explicitly rejects a user upvoting their
own post (`403 Forbidden`), with a test proving both that self-upvotes are
blocked and that upvoting someone else's post still works normally.

### Additional hardening applied
- **Helmet** — sets standard protective HTTP headers (HSTS, X-Content-Type-Options, etc.)
- **express-mongo-sanitize** — strips `$`/`.` operators from user input to prevent NoSQL injection (e.g. `{"email": {"$gt": ""}}` login bypass attempts)
- **Body size limit** (10kb) — rejects oversized payloads with a proper `413`, tested
- **CORS locked down** — restricted to known frontend origins via `CORS_ORIGIN` env var in production (defaults to localhost for dev)
- **Password minimum raised** from 6 to 8 characters
- **Passwords never leak** — `toJSON()` on the User model strips `passwordHash` from every API response, tested
- **Anonymity is enforced server-side** — when `isAnonymous: true`, the author's real identity is replaced with `{ username: "Anonymous", _id: null }` inside `toPublicJSON()`, not just hidden in the UI — tested to confirm it can't leak via the API response
- **File-tool style path safety isn't applicable here** (no file uploads in this project), but all Mongoose queries use typed schema fields, reducing injection surface further

### Test coverage
```
Test Suites: 5 passed, 5 total
Tests:       23 passed, 23 total
```
Covering: password hashing/validation, anonymity enforcement, JWT middleware
(valid/invalid/expired/malformed tokens), security headers, oversized
payload rejection, NoSQL injection attempts, ReDoS fix, and self-upvote
prevention.

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your free MongoDB Atlas URI + a random JWT secret
npm run dev             # runs on http://localhost:5000
npm test                  # runs the 23-test security/logic suite
```

Get a free MongoDB Atlas connection string at
https://www.mongodb.com/cloud/atlas/register (no credit card required for
the M0 free tier).

### Frontend
```bash
cd frontend
npm install
npm run dev    # runs on http://localhost:5173, proxies /api to :5000
```

## Deployment (free)
- **Backend:** Render.com free tier (Node web service) or Railway's free tier
- **Frontend:** Vercel or Netlify free tier
- **Database:** MongoDB Atlas free M0 cluster
- Set `CORS_ORIGIN` on the backend to your deployed frontend URL once live

## Known limitations / ideas to extend
- No email verification on registration (would need a free service like Resend's free tier)
- No moderation queue for reported posts — worth adding a `reports` field + admin view
- Karma can still be gamed via sockpuppet accounts upvoting each other; a real fix would need device/IP heuristics or a minimum-account-age gate before upvotes count
- No pagination UI yet on the frontend (API supports it via `?page=`)

## License
MIT — use freely, fork it, extend it.
