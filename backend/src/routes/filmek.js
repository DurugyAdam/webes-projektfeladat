// src/routes/filmek.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /filmek – összes aktív film
router.get("/", (req, res) => {
  const db = getDb();
  const filmek = db.prepare("SELECT * FROM filmek WHERE aktiv = 1 ORDER BY cim").all();
  res.json(filmek);
});

// GET /filmek/:id – egy film részletei + vetítései
router.get("/:id", param("id").isInt(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

  const db = getDb();
  const film = db.prepare("SELECT * FROM filmek WHERE id = ? AND aktiv = 1").get(req.params.id);
  if (!film) return res.status(404).json({ error: "A film nem található." });

  const vetitesek = db
    .prepare("SELECT * FROM vetitesek WHERE film_id = ? AND aktiv = 1 ORDER BY kezdes")
    .all(film.id);

  res.json({ ...film, vetitesek });
});

// POST /filmek – új film hozzáadása (csak admin)
router.post(
  "/",
  adminMiddleware,
  [
    body("cim").trim().notEmpty().withMessage("A cím megadása kötelező."),
    body("mufaj").trim().notEmpty().withMessage("A műfaj megadása kötelező."),
    body("idotartam").isInt({ min: 1 }).withMessage("Az időtartam pozitív egész szám kell legyen."),
    body("korcsoport").optional().isString(),
    body("leiras").optional().isString(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { cim, mufaj, idotartam, korcsoport = "12+", leiras = "", poster_url = "" } = req.body;
    const db = getDb();
    const result = db
      .prepare("INSERT INTO filmek (cim, mufaj, idotartam, korcsoport, leiras, poster_url) VALUES (?,?,?,?,?,?)")
      .run(cim, mufaj, idotartam, korcsoport, leiras, poster_url);

    res.status(201).json({ id: result.lastInsertRowid, cim, mufaj, idotartam, korcsoport });
  }
);

// DELETE /filmek/:id – film törlése (soft delete, csak admin)
router.delete("/:id", adminMiddleware, param("id").isInt(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

  const db = getDb();
  const info = db.prepare("UPDATE filmek SET aktiv = 0 WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "A film nem található." });
  res.json({ uzenet: "Film törölve." });
});

module.exports = router;