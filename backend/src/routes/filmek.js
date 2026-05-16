// src/routes/filmek.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /filmek – összes aktív film vetítéseivel
router.get("/", (req, res) => {
    const db = getDb();
    const filmek = db.prepare("SELECT * FROM filmek WHERE aktiv = 1 ORDER BY cim").all();

    const result = filmek.map(film => {
        const vetitesek = db.prepare(
            "SELECT * FROM vetitesek WHERE film_id = ? AND aktiv = 1"
        ).all(film.id);

        const vetitesekObj = {};
        vetitesek.forEach(v => {
            vetitesekObj[v.formatum] = JSON.parse(v.idopontok);
        });

        return { ...film, vetitesek: vetitesekObj };
    });

    res.json(result);
});

// GET /filmek/:id – egy film részletei
router.get("/:id", param("id").isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const db = getDb();
    const film = db.prepare("SELECT * FROM filmek WHERE id = ? AND aktiv = 1").get(req.params.id);
    if (!film) return res.status(404).json({ error: "A film nem található." });

    const vetitesek = db.prepare(
        "SELECT * FROM vetitesek WHERE film_id = ? AND aktiv = 1"
    ).all(film.id);

    const vetitesekObj = {};
    vetitesek.forEach(v => { vetitesekObj[v.formatum] = JSON.parse(v.idopontok); });

    res.json({ ...film, vetitesek: vetitesekObj });
});

// POST /filmek – új film (csak admin)
router.post("/", adminMiddleware, [
    body("cim").trim().notEmpty(),
    body("mufaj").trim().notEmpty(),
    body("idotartam").isInt({ min: 1 }),
    body("korcsoport").optional().isString(),
    body("kep_url").optional().isString(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { cim, mufaj, idotartam, korcsoport = "12+", leiras = "", kep_url = "" } = req.body;
    const db = getDb();
    const result = db.prepare(
        "INSERT INTO filmek (cim, mufaj, idotartam, korcsoport, leiras, kep_url) VALUES (?,?,?,?,?,?)"
    ).run(cim, mufaj, idotartam, korcsoport, leiras, kep_url);

    res.status(201).json({ id: result.lastInsertRowid, cim, mufaj, idotartam, korcsoport });
});

// DELETE /filmek/:id – film törlése (csak admin)
router.delete("/:id", adminMiddleware, param("id").isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const db = getDb();
    const info = db.prepare("UPDATE filmek SET aktiv = 0 WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "A film nem található." });
    res.json({ uzenet: "Film törölve." });
});

module.exports = router;