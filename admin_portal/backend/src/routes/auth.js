const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { readDb } = require("../utils/store");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// POST /api/auth/login
// Matches the contract documented in the frontend README:
//   request  { username, password }
//   success  { token, user: { id, name, role, ... } }
//   failure  4xx { message }
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const db = readDb();
  const user = db.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  const { passwordHash, ...safeUser } = user;
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, staffId: user.staffId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({ token, user: safeUser });
});

module.exports = router;
