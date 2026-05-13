// src/routes/vetitesek.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /vetitesek – összes aktív vetítés
router.get("/", (req, res) => {
  const db = getDb();
  const { film_id } = req.query;
  let vetitesek;
  if (film_id && Number.isInteger(Number(film_id))) {
    vetitesek = db
      .prepare(`
        SELECT v.*, f.cim, f.mufaj, f.korcsoport
        FROM vetitesek v JOIN filmek f ON v.film_id = f.id
        WHERE v.aktiv = 1 AND v.film_id = ?
        ORDER BY v.kezdes
      `)
      .all(Number(film_id));
  } else {
    vetitesek = db
      .prepare(`
        SELECT v.*, f.cim, f.mufaj, f.korcsoport
        FROM vetitesek v JOIN filmek f ON v.film_id = f.id
        WHERE v.aktiv = 1
        ORDER BY v.kezdes
      `)
      .all();
  }
  res.json(vetitesek);
});

// GET /vetitesek/:id – egy vetítés + foglalt székek
router.get("/:id", param("id").isInt(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

  const db = getDb();
  const vetites = db
    .prepare(`
      SELECT v.*, f.cim, f.mufaj, f.idotartam, f.korcsoport
      FROM vetitesek v JOIN filmek f ON v.film_id = f.id
      WHERE v.id = ? AND v.aktiv = 1
    `)
    .get(req.params.id);

  if (!vetites) return res.status(404).json({ error: "A vetítés nem található." });

  const foglalasok = db
    .prepare("SELECT szekek FROM foglalasok WHERE vetites_id = ? AND allapot = 'aktiv'")
    .all(req.params.id);

  const foglaltSzekek = foglalasok.flatMap(f => JSON.parse(f.szekek));

  res.json({ ...vetites, foglalt_szekek: foglaltSzekek });
});

// POST /vetitesek – új vetítés (csak admin)
router.post(
  "/",
  adminMiddleware,
  [
    body("film_id").isInt({ min: 1 }).withMessage("Érvényes film_id szükséges."),
    body("kezdes").notEmpty().withMessage("A kezdési időpont megadása kötelező."),
    body("terem").trim().notEmpty().withMessage("A terem megadása kötelező."),
    body("formatum").optional().isString(),
    body("max_ferohet").optional().isInt({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { film_id, kezdes, terem, formatum = "2D", max_ferohet = 100 } = req.body;
    const db = getDb();

    const film = db.prepare("SELECT id FROM filmek WHERE id = ? AND aktiv = 1").get(film_id);
    if (!film) return res.status(404).json({ error: "A megadott film nem létezik." });

    const result = db
      .prepare("INSERT INTO vetitesek (film_id, kezdes, terem, formatum, max_ferohet) VALUES (?,?,?,?,?)")
      .run(film_id, kezdes, terem, formatum, max_ferohet);

    res.status(201).json({ id: result.lastInsertRowid, film_id, kezdes, terem, formatum, max_ferohet });
  }
);

module.exports = router;