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
            kep_url     TEXT,
            aktiv       INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS vetitesek (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            film_id      INTEGER NOT NULL REFERENCES filmek(id),
            formatum     TEXT    NOT NULL DEFAULT '2D',
            idopontok    TEXT    NOT NULL,
            aktiv        INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS alap_arak (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            formatum    TEXT    NOT NULL UNIQUE,
            ar          INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kuponok (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            kod         TEXT    NOT NULL UNIQUE,
            tipus       TEXT    NOT NULL,
            ertek       INTEGER NOT NULL,
            nev         TEXT    NOT NULL,
            limit_db    INTEGER,
            csak_kedd   INTEGER NOT NULL DEFAULT 0,
            aktiv       INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS foglalasok (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            felhasznalo_id INTEGER NOT NULL REFERENCES felhasznalok(id),
            vetites_id     INTEGER,
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

    // ── Alap árak seed ────────────────────────────────────────
    const arCount = db.prepare("SELECT COUNT(*) AS cnt FROM alap_arak").get().cnt;
    if (arCount === 0) {
        const insertAr = db.prepare("INSERT INTO alap_arak (formatum, ar) VALUES (?, ?)");
        [
            ["2D", 3500], ["3D", 4000], ["IMAX", 5000], ["4DX", 5500],
            ["Feliratos", 3500], ["Szinkronos", 3500], ["Eredeti nyelv", 3500],
        ].forEach(([f, a]) => insertAr.run(f, a));
    }

    // ── Kuponok seed ──────────────────────────────────────────
    const kuponCount = db.prepare("SELECT COUNT(*) AS cnt FROM kuponok").get().cnt;
    if (kuponCount === 0) {
        const insertKupon = db.prepare(`INSERT INTO kuponok (kod, tipus, ertek, nev, limit_db, csak_kedd) VALUES (?, ?, ?, ?, ?, ?)`);
        insertKupon.run("DIAK",       "fix",      1800, "Diák kedvezmény",        null, 0);
        insertKupon.run("WELCOME10",  "szazalek", 10,   "10% kedvezmény",         1,    0);
        insertKupon.run("MOVIE50",    "szazalek", 50,   "50% kedvezmény",         1,    0);
        insertKupon.run("DATE",       "szazalek", 10,   "Date Night -10%",        2,    0);
        insertKupon.run("ROMANTIKUS", "szazalek", 25,   "Romantikus este -25%",   2,    0);
        insertKupon.run("KEDD20",     "szazalek", 20,   "Keddi mozinap -20%",     null, 1);
    }

    // ── Filmek seed ───────────────────────────────────────────
    const filmCount = db.prepare("SELECT COUNT(*) AS cnt FROM filmek").get().cnt;
    if (filmCount === 0) {
        const insertFilm = db.prepare(`INSERT INTO filmek (cim, mufaj, idotartam, korcsoport, leiras, kep_url) VALUES (?, ?, ?, ?, ?, ?)`);
        const insertVetites = db.prepare(`INSERT INTO vetitesek (film_id, formatum, idopontok) VALUES (?, ?, ?)`);

        const filmAdatok = [
            {
                cim: "Galaktikus Küldetés", mufaj: "Sci-fi", ido: 135, kor: "12+",
                kep: "képek/Galaktikus_küldetés.png",
                leiras: "A fiatal csillagász, Ádám egy rejtélyes jelzést fog a mélységes űrből, amely egy ismeretlen civilizáció létezésére utal. Önkéntes legénységével elindul a titokzatos forrás felé, ám hamar rájönnek: nem ők az egyedüliek, akik a jelre vadásznak. Lenyűgöző látványvilág, szívdobogtató fordulatok és egy kérdés, amely az emberiség jövőjét érinti.",
                vetitesek: { "2D": ["13:00","16:30","21:10"], "3D": ["18:45"], "IMAX": ["15:00","20:00"] }
            },
            {
                cim: "Éjszaka a Város Felett", mufaj: "Thriller", ido: 108, kor: "16+",
                kep: "képek/éjszaka a város velett.png",
                leiras: "Egy magányos éjszakai taxisofőr véletlenül szemtanúja lesz egy brutális bűncselekménynek a belváros szívében. Menekülés közben rájön, hogy az elkövető a város egyik legbefolyásosabb embere. Senkiben sem bízhat, mindenki ellen van – és az éjszaka egyre rövidebb.",
                vetitesek: { "2D": ["17:00","22:00"], "Feliratos": ["19:30"] }
            },
            {
                cim: "Családi Kalandpark", mufaj: "Családi", ido: 95, kor: "6+",
                kep: "képek/családi_kalandpark.png",
                leiras: "A Kovács testvérek egy varázslatos titkos parkra bukkannak az erdő mélyén, ahol az összes játékszer életre kel éjfélkor. Barátságokat kötnek, veszélyeket győznek le és megtanulják, hogy a legjobb kalandokat mindig együtt, a szeretteinkkel éljük át.",
                vetitesek: { "3D": ["10:00","14:00"], "Szinkronos": ["12:00","16:15"] }
            },
            {
                cim: "Utolsó Esély", mufaj: "Akció", ido: 125, kor: "16+",
                kep: "képek/utolsó_esély.png",
                leiras: "Egy egykori különleges egység tagja visszavonultan él, amikor egy kartellfőnök elrabolja a lányát. Nincs más választása: egyedül indul az ellenséges területre, ahol minden lépés életveszélyes. Robbanásos akciójelenetek, kíméletlen harcok és egy apa korlátlan szeretete.",
                vetitesek: { "2D": ["20:00","22:30"], "Eredeti nyelv": ["18:00"] }
            },
            {
                cim: "Mélységek Titka", mufaj: "Dráma", ido: 112, kor: "12+",
                kep: "képek/Mélységek Titka.png",
                leiras: "Egy mélytengeri kutató expedíció tagjai egy ősi, elfeledett romvárosra bukkannak az óceán fenekén. A felfedezés ünnepe hamar szorongássá változik, amikor kiderül, hogy a romok nem teljesen elhagyatottak. Drámai emberi történetek és a természet titkainak félelmetes feltárása.",
                vetitesek: { "2D": ["15:00","17:30"], "Feliratos": ["20:00"] }
            },
            {
                cim: "Vérhold", mufaj: "Horror", ido: 105, kor: "18+",
                kep: "képek/Vérhold.png",
                leiras: "Egy kis falusi közösséget különös jelenségek kezdenek gyötörni minden telihold éjszakáján. Az újonnan érkező orvos lassan rájön, hogy a titok a falu alapításáig nyúlik vissza. Amit talál, az megkérdőjelez mindent, amit valóságnak hitt – és talán nincs visszaút.",
                vetitesek: { "2D": ["21:00","23:00"] }
            },
            {
                cim: "Az Erdő Szelleme", mufaj: "Animáció", ido: 88, kor: "6+",
                kep: "képek/Az Erdő Szelleme.png",
                leiras: "A kis Lili egy ősrégi erdőbe téved, ahol megismerkedik az erdő őrzőjével, egy különös, ragyogó szellemmel. Együtt fedezik fel az erdő titkait, miközben megmentik azt a pusztulástól. Káprázatos animáció, szívmelengető barátság és egy üzenet a természet szeretetéről.",
                vetitesek: { "3D": ["10:00","12:30"], "Szinkronos": ["15:00"] }
            },
            {
                cim: "Sivatagi Vihar", mufaj: "Western", ido: 130, kor: "16+",
                kep: "képek/Sivatagi Vihar.png",
                leiras: "A vadnyugat legkeresettebb fejvadásza egyetlen feladatot kap: egy egész tartományt rettegésben tartó bandavezér elfogása. A hosszú hajsza során azonban kiderül, hogy áldozat és gonosztevő szerepe korántsem olyan egyértelmű, mint azt eleinte gondolta. Homok, vér és igazság a naplementében.",
                vetitesek: { "2D": ["16:00","18:30"], "Feliratos": ["21:00"] }
            },
            {
                cim: "Kvantumcsapda", mufaj: "Sci-fi", ido: 140, kor: "12+",
                kep: "képek/Kvantumcsapda.png",
                leiras: "Egy kísérletező fizikus véletlenül megnyit egy kvantumportált, amelyen át párhuzamos valóságok érintkeznek. Ahogy egyre több idővonalon lép át, rájön: minden döntésének következménye van a többi univerzumban is. Filozofikus mélységű tudományos-fantasztikus thriller, amely az emberi identitás kérdéseit feszegeti.",
                vetitesek: { "IMAX": ["17:00","20:30"], "3D": ["14:30"] }
            },
            {
                cim: "Jeges Szívek", mufaj: "Romantikus", ido: 115, kor: "12+",
                kep: "képek/Jeges Szívek.png",
                leiras: "Két rivális műkorcsolyázó kénytelen együtt edzeni egy komoly verseny előtt. Az eleinte fagyos viszony lassan megolvad, miközben kiderül, hogy mindkettejük mögött mély sebek rejtőznek. Egy érzékeny szerelmi történet a küzdésről, megbocsátásról és arról, hogy a győzelem nem mindig a pályán dől el.",
                vetitesek: { "2D": ["14:30","17:00"], "Szinkronos": ["19:30"] }
            },
            {
                cim: "Arany Kalitka", mufaj: "Dráma", ido: 125, kor: "16+",
                kep: "képek/Arany Kalitka.png",
                leiras: "Egy fiatal tehetséges zongorista bejut a világ legelitebb zeneakadémiájára, ahol minden adott a sikerhez – de az ár a szabadsága. Miközben a tökéletesség felé hajtják, lassan elveszíti önmagát. Drámai erejű film a kreativitás, a nyomás és az emberi lélek törékenységéről.",
                vetitesek: { "2D": ["18:00","20:30"], "Feliratos": ["16:00"] }
            },
            {
                cim: "Csillagközi Nomád", mufaj: "Sci-fi", ido: 150, kor: "12+",
                kep: "képek/Csillagközi Nomád.png",
                leiras: "A Föld utolsó mentőhajója elindul egy lakható bolygó felé, fedélzetén az emberiség maradékával. Az út során azonban a legénység tagjai egyre furcsább jelenségeket tapasztalnak, amelyek megkérdőjelezik, valóban egyedül utaznak-e a végtelenben. Epikus sci-fi kaland az emberi kitartásról és reményről.",
                vetitesek: { "IMAX": ["19:00","22:00"], "4DX": ["17:00"] }
            },
            {
                cim: "Bíbor Maszk", mufaj: "Akció", ido: 118, kor: "16+",
                kep: "képek/Bíbor Maszk.png",
                leiras: "A város árnyékában egy titokzatos maszkos igazságosztó tűnik fel, aki bűnözők egész hálózatát számolta fel egyetlen éjszaka alatt. A rendőrség nyomoz, a sajtó rajong, a bűnvilág retteg – de ki ez az ember valójában, és mi a valódi célja? Pörgős akciófilm meglepő fordulatokkal.",
                vetitesek: { "2D": ["15:30","20:30"], "3D": ["18:00"] }
            },
            {
                cim: "Óceán Hangjai", mufaj: "Dokumentum", ido: 100, kor: "6+",
                kep: "képek/Óceán Hangjai.png",
                leiras: "Egy díjnyertes természetfilmes csapat három évet töltött az óceánok mélyén, hogy megörökítse a víz alatti világ soha nem látott pillanatait. A film nem csupán lenyűgöző felvételeket mutat, hanem megrázó üzenetet is hordoz az óceánok pusztulásáról és arról, mit tehetünk még ma.",
                vetitesek: { "2D": ["11:00","13:30"], "Feliratos": ["16:00"] }
            },
        ];

        filmAdatok.forEach(f => {
            const result = insertFilm.run(f.cim, f.mufaj, f.ido, f.kor, f.leiras, f.kep);
            const filmId = result.lastInsertRowid;
            Object.entries(f.vetitesek).forEach(([fmt, idok]) => {
                insertVetites.run(filmId, fmt, JSON.stringify(idok));
            });
        });
    }

    // ── Admin user seed ───────────────────────────────────────
    const adminMeglevo = db.prepare("SELECT id FROM felhasznalok WHERE email='admin@mozifoglalo.hu'").get();
    if (!adminMeglevo) {
        const bcrypt = require("bcryptjs");
        const hash = bcrypt.hashSync("Admin1234!", 10);
        db.prepare("INSERT INTO felhasznalok (nev, email, jelszo, szerep) VALUES (?,?,?,?)")
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