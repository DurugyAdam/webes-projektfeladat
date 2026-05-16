// src/db/init.js
const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./mozifoglalo.db";

function initDb(dbPath = DB_PATH) {
    const db = new Database(path.resolve(dbPath));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS felhasznalok (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nev        TEXT    NOT NULL,
            email      TEXT    NOT NULL UNIQUE,
            jelszo     TEXT    NOT NULL,
            szerep     TEXT    NOT NULL DEFAULT 'user',
            letrehozva DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS filmek (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cim         TEXT    NOT NULL,
            mufaj       TEXT    NOT NULL,
            idotartam   INTEGER NOT NULL,
            korcsoport  TEXT    NOT NULL DEFAULT '12+',
            leiras      TEXT,
            poster_url  TEXT,
            aktiv       INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS vetitesek (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            film_id      INTEGER NOT NULL REFERENCES filmek(id),
            kezdes       DATETIME NOT NULL,
            terem        TEXT    NOT NULL,
            formatum     TEXT    NOT NULL DEFAULT '2D',
            max_ferohet  INTEGER NOT NULL DEFAULT 100,
            aktiv        INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS foglalasok (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            felhasznalo_id INTEGER NOT NULL REFERENCES felhasznalok(id),
            vetites_id     INTEGER NOT NULL,
            film_id        INTEGER NOT NULL DEFAULT 1,
            idopont        TEXT    NOT NULL DEFAULT '',
            formatum       TEXT    NOT NULL DEFAULT '2D',
            szekek         TEXT    NOT NULL,
            allapot        TEXT    NOT NULL DEFAULT 'aktiv',
            letrehozva     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tiltott_szekek (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            film_id         INTEGER NOT NULL,
            idopont         TEXT    NOT NULL,
            formatum        TEXT    NOT NULL,
            szek_azonosito  TEXT    NOT NULL,
            letrehozva      DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(film_id, idopont, formatum, szek_azonosito)
        );

        CREATE TABLE IF NOT EXISTS rendelesek (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            felhasznalo_id INTEGER NOT NULL REFERENCES felhasznalok(id),
            tetelek        TEXT    NOT NULL,
            osszeg         INTEGER NOT NULL,
            allapot        TEXT    NOT NULL DEFAULT 'leadva',
            letrehozva     DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Seed filmek
    const filmCount = db.prepare("SELECT COUNT(*) AS cnt FROM filmek").get().cnt;
    if (filmCount === 0) {
        const insertFilm = db.prepare(`INSERT INTO filmek (cim,mufaj,idotartam,korcsoport,leiras) VALUES (@cim,@mufaj,@idotartam,@korcsoport,@leiras)`);
        [
            { cim:"Galaktikus Küldetés",    mufaj:"Sci-fi",   idotartam:135, korcsoport:"12+", leiras:"Sci-fi kaland." },
            { cim:"Éjszaka a Város Felett", mufaj:"Thriller", idotartam:108, korcsoport:"16+", leiras:"Thriller." },
            { cim:"Családi Kalandpark",     mufaj:"Családi",  idotartam:95,  korcsoport:"6+",  leiras:"Kalandfilm." },
            { cim:"Utolsó Esély",           mufaj:"Akció",    idotartam:125, korcsoport:"16+", leiras:"Akciófilm." },
        ].forEach(f => insertFilm.run(f));

        const ma = new Date().toISOString().slice(0,10);
        const iv = db.prepare(`INSERT INTO vetitesek (film_id,kezdes,terem,formatum) VALUES (?,?,?,?)`);
        iv.run(1,`${ma} 16:30`,"1-es terem","IMAX");
        iv.run(1,`${ma} 18:45`,"2-es terem","3D");
        iv.run(2,`${ma} 17:00`,"3-as terem","2D");
        iv.run(3,`${ma} 14:00`,"4-es terem","3D");
    }

    // Admin user seed
    const adminMeglevo = db.prepare("SELECT id FROM felhasznalok WHERE email='admin@mozifoglalo.hu'").get();
    if (!adminMeglevo) {
        const bcrypt = require("bcryptjs");
        const hash = bcrypt.hashSync("Admin1234!", 10);
        db.prepare("INSERT INTO felhasznalok (nev,email,jelszo,szerep) VALUES (?,?,?,?)")
            .run("Adminisztrátor", "admin@mozifoglalo.hu", hash, "admin");
        console.log("✅ Admin user létrehozva: admin@mozifoglalo.hu / Admin1234!");
    }

    return db;
}

if (require.main === module) {
    const db = initDb();
    console.log("✅ Adatbázis inicializálva:", path.resolve(DB_PATH));
    db.close();
}

module.exports = { initDb };