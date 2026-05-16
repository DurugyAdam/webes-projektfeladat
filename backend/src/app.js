// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes       = require("./routes/auth");
const filmekRoutes     = require("./routes/filmek");
const vetitesekRoutes  = require("./routes/vetitesek");
const foglalasokRoutes = require("./routes/foglalasok");
const rendelesekRoutes = require("./routes/rendelesek");
const adminRoutes      = require("./routes/admin");
const kuponokRoutes    = require("./routes/kuponok");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ uzenet: "MOZIFoglaló API – működik ✅", verzio: "1.0.0" }));
app.use("/auth",       authRoutes);
app.use("/filmek",     filmekRoutes);
app.use("/vetitesek",  vetitesekRoutes);
app.use("/foglalasok", foglalasokRoutes);
app.use("/rendeles",   rendelesekRoutes);
app.use("/admin",      adminRoutes);
app.use("/kuponok",    kuponokRoutes);

app.use((req, res) => res.status(404).json({ error: "Az endpoint nem található." }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: "Szerverhiba." }); });

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🎬 MOZIFoglaló szerver fut: http://localhost:${PORT}`));
}

module.exports = app;