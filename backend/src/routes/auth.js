// src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");

const router = express.Router();

// POST /auth/regisztracio
router.post(
  "/regisztracio",
  [
    body("nev").trim().notEmpty().withMessage("A név megadása kötelező."),
    body("email").isEmail().withMessage("Érvénytelen e-mail cím."),
    body("jelszo").isLength({ min: 6 }).withMessage("A jelszónak legalább 6 karakter hosszúnak kell lennie."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ hibak: errors.array() });
    }

    const { nev, email, jelszo } = req.body;
    const db = getDb();

    const meglevo = db.prepare("SELECT id FROM felhasznalok WHERE email = ?").get(email);
    if (meglevo) {
      return res.status(409).json({ error: "Ez az e-mail cím már regisztrált." });
    }

    const hash = bcrypt.hashSync(jelszo, 10);
    const result = db
      .prepare("INSERT INTO felhasznalok (nev, email, jelszo) VALUES (?, ?, ?)")
      .run(nev, email, hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, email, nev, szerep: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      uzenet: "Sikeres regisztráció!",
      felhasznalo: { id: result.lastInsertRowid, nev, email, szerep: "user" },
      token,
    });
  }
);

// POST /auth/bejelentkezes
router.post(
  "/bejelentkezes",
  [
    body("email").isEmail().withMessage("Érvénytelen e-mail cím."),
    body("jelszo").notEmpty().withMessage("A jelszó megadása kötelező."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ hibak: errors.array() });
    }

    const { email, jelszo } = req.body;
    const db = getDb();

    const user = db.prepare("SELECT * FROM felhasznalok WHERE email = ?").get(email);
    if (!user || !bcrypt.compareSync(jelszo, user.jelszo)) {
      return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nev: user.nev, szerep: user.szerep },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      uzenet: "Sikeres bejelentkezés!",
      felhasznalo: { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
      token,
    });
  }
);

module.exports = router;