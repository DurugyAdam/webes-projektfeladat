// src/routes/foglalasok.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /foglalasok – bejelentkezett felhasználó saját foglalásai
router.get("/", authMiddleware, (req, res) => {
  const db = getDb();
  const foglalasok = db
    .prepare(`
      SELECT fog.id, fog.szekek, fog.allapot, fog.letrehozva,
             v.kezdes, v.terem, v.formatum,
             f.cim AS film_cim, f.mufaj
      FROM foglalasok fog
      JOIN vetitesek v ON fog.vetites_id = v.id
      JOIN filmek f ON v.film_id = f.id
      WHERE fog.felhasznalo_id = ?
      ORDER BY fog.letrehozva DESC
    `)
    .all(req.user.id);

  const parsed = foglalasok.map(f => ({ ...f, szekek: JSON.parse(f.szekek) }));
  res.json(parsed);
});

// POST /foglalasok – új foglalás
router.post(
  "/",
  authMiddleware,
  [
    body("vetites_id").isInt({ min: 1 }).withMessage("Érvényes vetites_id szükséges."),
    body("szekek").isArray({ min: 1 }).withMessage("Legalább egy széket ki kell választani."),
    body("szekek.*").isString().withMessage("A székek szöveges azonosítók legyenek."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { vetites_id, szekek } = req.body;
    const db = getDb();

    const vetites = db
      .prepare("SELECT * FROM vetitesek WHERE id = ? AND aktiv = 1")
      .get(vetites_id);
    if (!vetites) return res.status(404).json({ error: "A vetítés nem található." });

    const meglevoFoglalasok = db
      .prepare("SELECT szekek FROM foglalasok WHERE vetites_id = ? AND allapot = 'aktiv'")
      .all(vetites_id);
    const foglaltSzekek = meglevoFoglalasok.flatMap(f => JSON.parse(f.szekek));
    const utkozes = szekek.filter(s => foglaltSzekek.includes(s));
    if (utkozes.length > 0) {
      return res.status(409).json({ error: `A következő székek már foglaltak: ${utkozes.join(", ")}` });
    }

    const result = db
      .prepare("INSERT INTO foglalasok (felhasznalo_id, vetites_id, szekek) VALUES (?,?,?)")
      .run(req.user.id, vetites_id, JSON.stringify(szekek));

    res.status(201).json({
      id: result.lastInsertRowid,
      vetites_id,
      szekek,
      allapot: "aktiv",
    });
  }
);

// DELETE /foglalasok/:id – foglalás lemondása
router.delete("/:id", authMiddleware, param("id").isInt(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

  const db = getDb();
  const foglalas = db
    .prepare("SELECT * FROM foglalasok WHERE id = ? AND felhasznalo_id = ?")
    .get(req.params.id, req.user.id);

  if (!foglalas) return res.status(404).json({ error: "A foglalás nem található." });
  if (foglalas.allapot === "lemondva") return res.status(400).json({ error: "Ez a foglalás már le lett mondva." });

  db.prepare("UPDATE foglalasok SET allapot = 'lemondva' WHERE id = ?").run(req.params.id);
  res.json({ uzenet: "Foglalás sikeresen lemondva." });
});

module.exports = router;