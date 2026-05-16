// src/routes/admin.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { getDb } = require("../db/connection");
const { adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// GET /admin/szekek – tiltott székek listája
router.get("/szekek", adminMiddleware, (req, res) => {
    const db = getDb();
    const tiltottak = db.prepare("SELECT * FROM tiltott_szekek ORDER BY letrehozva DESC").all();
    res.json(tiltottak);
});

// POST /admin/szekek/tilt – szék tiltása
router.post("/szekek/tilt",
    adminMiddleware,
    [
        body("film_id").isInt({ min:1 }),
        body("idopont").notEmpty(),
        body("formatum").notEmpty(),
        body("szekek").isArray({ min:1 }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

        const { film_id, idopont, formatum, szekek } = req.body;
        const db = getDb();

        const insert = db.prepare(`
            INSERT OR IGNORE INTO tiltott_szekek (film_id, idopont, formatum, szek_azonosito)
            VALUES (?, ?, ?, ?)
        `);
        szekek.forEach(s => insert.run(film_id, idopont, formatum, s));

        res.json({ uzenet: `${szekek.length} szék tiltva.` });
    }
);

// POST /admin/szekek/szabadit – szék felszabadítása
router.post("/szekek/szabadit",
    adminMiddleware,
    [
        body("film_id").isInt({ min:1 }),
        body("idopont").notEmpty(),
        body("formatum").notEmpty(),
        body("szekek").isArray({ min:1 }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ hibak: errors.array() });

        const { film_id, idopont, formatum, szekek } = req.body;
        const db = getDb();

        szekek.forEach(s => {
            db.prepare(`
                DELETE FROM tiltott_szekek
                WHERE film_id=? AND idopont=? AND formatum=? AND szek_azonosito=?
            `).run(film_id, idopont, formatum, s);
        });

        res.json({ uzenet: `${szekek.length} szék felszabadítva.` });
    }
);

// GET /admin/foglalasok – összes foglalás listája
router.get("/foglalasok", adminMiddleware, (req, res) => {
    const db = getDb();
    const foglalasok = db.prepare(`
        SELECT f.*, u.nev, u.email
        FROM foglalasok f
        JOIN felhasznalok u ON f.felhasznalo_id = u.id
        ORDER BY f.letrehozva DESC
    `).all();
    const parsed = foglalasok.map(f => ({ ...f, szekek: JSON.parse(f.szekek) }));
    res.json(parsed);
});

module.exports = router;