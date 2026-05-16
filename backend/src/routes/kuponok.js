// src/routes/kuponok.js
const express = require("express");
const { getDb } = require("../db/connection");

const router = express.Router();

// GET /kuponok – összes aktív kupon
router.get("/", (req, res) => {
    const db = getDb();
    const kuponok = db.prepare("SELECT * FROM kuponok WHERE aktiv = 1").all();
    res.json(kuponok);
});

// GET /kuponok/arak – összes alapár
router.get("/arak", (req, res) => {
    const db = getDb();
    const arak = db.prepare("SELECT * FROM alap_arak").all();
    // Objektummá alakítjuk: { "2D": 3500, "3D": 4000, ... }
    const arObj = {};
    arak.forEach(a => { arObj[a.formatum] = a.ar; });
    res.json(arObj);
});

module.exports = router;