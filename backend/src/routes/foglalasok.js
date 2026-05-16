// src/routes/foglalasok.js
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /foglalasok/szekek
router.get("/szekek", (req, res) => {
    const { film_id, idopont, formatum } = req.query;
    if (!film_id || !idopont || !formatum)
        return res.status(400).json({ error: "Hiányzó paraméterek." });

    const db = getDb();
    let sajatUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const jwt = require("jsonwebtoken");
            sajatUserId = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET).id;
        } catch {}
    }

    // Minden aktív foglalás – székenként külön sor
    const foglalasok = db.prepare(`
        SELECT felhasznalo_id, szekek, id FROM foglalasok
        WHERE film_id=? AND idopont=? AND formatum=? AND allapot='aktiv'
    `).all(film_id, idopont, formatum);

    const foglalt = [];
    const sajat = [];

    foglalasok.forEach(f => {
        const szekek = JSON.parse(f.szekek);
        szekek.forEach(s => {
            if (sajatUserId && f.felhasznalo_id === sajatUserId) {
                sajat.push({ szek: s, foglalas_id: f.id });
            } else {
                foglalt.push(s);
            }
        });
    });

    const tiltott = db.prepare(`
        SELECT szek_azonosito FROM tiltott_szekek
        WHERE film_id=? AND idopont=? AND formatum=?
    `).all(film_id, idopont, formatum).map(t => t.szek_azonosito);

    res.json({ foglalt, tiltott, sajat });
});

// GET /foglalasok
router.get("/", authMiddleware, (req, res) => {
    const db = getDb();
    const foglalasok = db.prepare(
        "SELECT * FROM foglalasok WHERE felhasznalo_id=? ORDER BY letrehozva DESC"
    ).all(req.user.id);
    res.json(foglalasok.map(f => ({ ...f, szekek: JSON.parse(f.szekek) })));
});

// POST /foglalasok – székenként külön sor az adatbázisban
router.post("/", authMiddleware, [
    body("vetites_id").isInt({ min: 1 }),
    body("szekek").isArray({ min: 1 }),
    body("film_id").isInt({ min: 1 }),
    body("idopont").notEmpty(),
    body("formatum").notEmpty(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const { vetites_id, szekek, film_id, idopont, formatum } = req.body;
    const db = getDb();

    // Max 8 szék ellenőrzése
    const sajatSzekSzam = db.prepare(`
        SELECT COUNT(*) as cnt FROM foglalasok
        WHERE film_id=? AND idopont=? AND formatum=? AND felhasznalo_id=? AND allapot='aktiv'
    `).get(film_id, idopont, formatum, req.user.id).cnt;

    if (sajatSzekSzam + szekek.length > 8)
        return res.status(400).json({ error: `Maximum 8 helyet foglalhatsz. Jelenleg ${sajatSzekSzam} helyed van.` });

    // Foglalt székek ellenőrzése
    const foglaltSzekek = db.prepare(`
        SELECT szekek FROM foglalasok
        WHERE film_id=? AND idopont=? AND formatum=? AND allapot='aktiv'
    `).all(film_id, idopont, formatum).flatMap(f => JSON.parse(f.szekek));

    const utkozes = szekek.filter(s => foglaltSzekek.includes(s));
    if (utkozes.length > 0)
        return res.status(409).json({ error: `Már foglalt székek: ${utkozes.join(", ")}` });

    // Tiltott székek ellenőrzése
    const tiltottSzekek = db.prepare(`
        SELECT szek_azonosito FROM tiltott_szekek
        WHERE film_id=? AND idopont=? AND formatum=?
    `).all(film_id, idopont, formatum).map(t => t.szek_azonosito);

    const tiltottUtkozes = szekek.filter(s => tiltottSzekek.includes(s));
    if (tiltottUtkozes.length > 0)
        return res.status(409).json({ error: `Nem elérhető székek: ${tiltottUtkozes.join(", ")}` });

    // Székenként külön sor beszúrása
    const insert = db.prepare(`
        INSERT INTO foglalasok (felhasznalo_id, vetites_id, film_id, idopont, formatum, szekek)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const ids = [];
    const insertAll = db.transaction(() => {
        szekek.forEach(szek => {
            const result = insert.run(req.user.id, vetites_id, film_id, idopont, formatum, JSON.stringify([szek]));
            ids.push(result.lastInsertRowid);
        });
    });
    insertAll();

    res.status(201).json({ ids, szekek, allapot: "aktiv" });
});

// DELETE /foglalasok/:id – saját foglalás lemondása
router.delete("/:id", authMiddleware, param("id").isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const db = getDb();
    const foglalas = db.prepare(
        "SELECT * FROM foglalasok WHERE id=? AND felhasznalo_id=?"
    ).get(req.params.id, req.user.id);

    if (!foglalas) return res.status(404).json({ error: "Foglalás nem található." });
    if (foglalas.allapot === "lemondva") return res.status(400).json({ error: "Már le lett mondva." });

    db.prepare("UPDATE foglalasok SET allapot='lemondva' WHERE id=?").run(req.params.id);
    res.json({ uzenet: "Foglalás lemondva." });
});

// DELETE /foglalasok/admin/:id – admin bármely foglalást lemondhat
router.delete("/admin/:id", adminMiddleware, param("id").isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

    const db = getDb();
    const foglalas = db.prepare("SELECT * FROM foglalasok WHERE id=?").get(req.params.id);
    if (!foglalas) return res.status(404).json({ error: "Foglalás nem található." });

    db.prepare("UPDATE foglalasok SET allapot='lemondva' WHERE id=?").run(req.params.id);
    res.json({ uzenet: "Foglalás lemondva (admin)." });
});

module.exports = router;