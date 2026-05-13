// src/routes/rendelesek.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// POST /rendeles – étel/ital rendelés leadása
router.post(
  "/",
  authMiddleware,
  [
    body("tetelek").isArray({ min: 1 }).withMessage("A rendelésnek legalább egy tételt kell tartalmaznia."),
    body("tetelek.*.id").isInt({ min: 1 }).withMessage("Érvényes termék azonosító szükséges."),
    body("tetelek.*.nev").trim().notEmpty().withMessage("A termék neve kötelező."),
    body("tetelek.*.ar").isInt({ min: 1 }).withMessage("Az ár pozitív egész szám kell legyen."),
    body("tetelek.*.mennyiseg").isInt({ min: 1 }).withMessage("A mennyiség legalább 1 kell legyen."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { tetelek } = req.body;
    const osszeg = tetelek.reduce((sum, t) => sum + t.ar * t.mennyiseg, 0);
    const db = getDb();

    const result = db
      .prepare("INSERT INTO rendelesek (felhasznalo_id, tetelek, osszeg) VALUES (?,?,?)")
      .run(req.user.id, JSON.stringify(tetelek), osszeg);

    res.status(201).json({
      id: result.lastInsertRowid,
      osszeg,
      allapot: "leadva",
    });
  }
);

// GET /rendeles – saját rendelések listája
router.get("/", authMiddleware, (req, res) => {
  const db = getDb();
  const rendelesek = db
    .prepare("SELECT * FROM rendelesek WHERE felhasznalo_id = ? ORDER BY letrehozva DESC")
    .all(req.user.id);

  const parsed = rendelesek.map(r => ({ ...r, tetelek: JSON.parse(r.tetelek) }));
  res.json(parsed);
});

module.exports = router;