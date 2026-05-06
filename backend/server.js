const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;
const JWT_SECRET = "mozifoglalo_titkos_kulcs_2025"; // élesben .env-be tedd!

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── PostgreSQL kapcsolat ──────────────────────────────────────
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "mozi_foglalo",
  user: "postgres",
  password: "postgres", // ← a telepítéskor megadott jelszó
});

// ── Auth middleware (védett végpontokhoz) ─────────────────────
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nincs token" });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Érvénytelen token" });
  }
}

// ══════════════════════════════════════════════════════════════
//  REGISZTRÁCIÓ  POST /auth/register
// ══════════════════════════════════════════════════════════════
app.post("/auth/register", async (req, res) => {
  const { nev, email, jelszo } = req.body;

  if (!nev || !email || !jelszo) {
    return res.status(400).json({ error: "Minden mező kitöltése kötelező" });
  }
  if (jelszo.length < 6) {
    return res.status(400).json({ error: "A jelszó legalább 6 karakter legyen" });
  }

  try {
    // Ellenőrizzük, hogy az email már foglalt-e
    const meglevo = await pool.query(
      "SELECT id FROM felhasznalok WHERE email = $1",
      [email.toLowerCase()]
    );
    if (meglevo.rows.length > 0) {
      return res.status(409).json({ error: "Ez az email cím már foglalt" });
    }

    const hash = await bcrypt.hash(jelszo, 10);
    const result = await pool.query(
      `INSERT INTO felhasznalok (nev, email, jelszo_hash, szerep)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, nev, email, szerep`,
      [nev, email.toLowerCase(), hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Szerverhiba" });
  }
});

// ══════════════════════════════════════════════════════════════
//  BEJELENTKEZÉS  POST /auth/login
// ══════════════════════════════════════════════════════════════
app.post("/auth/login", async (req, res) => {
  const { email, jelszo } = req.body;

  if (!email || !jelszo) {
    return res.status(400).json({ error: "Email és jelszó megadása kötelező" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM felhasznalok WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Hibás email vagy jelszó" });
    }

    const user = result.rows[0];
    const egyezik = await bcrypt.compare(jelszo, user.jelszo_hash);

    if (!egyezik) {
      return res.status(401).json({ error: "Hibás email vagy jelszó" });
    }

    const token = jwt.sign(
      { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, nev: user.nev, email: user.email, szerep: user.szerep },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Szerverhiba" });
  }
});

// ══════════════════════════════════════════════════════════════
//  SAJÁT PROFIL  GET /auth/me  (token kell)
// ══════════════════════════════════════════════════════════════
app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nev, email, szerep FROM felhasznalok WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Nem található" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Szerverhiba" });
  }
});

// ══════════════════════════════════════════════════════════════
//  FILMEK  GET /filmek
// ══════════════════════════════════════════════════════════════
app.get("/filmek", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM filmek ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Szerverhiba" });
  }
});

// ── Indítás ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Szerver fut: http://localhost:${PORT}`);
});