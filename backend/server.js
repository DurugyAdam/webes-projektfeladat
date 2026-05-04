const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "mozi",
    password: "IDE_A_JELSZAVAD",
    port: 5432,
});

// API végpont
app.get("/filmek", async (req, res) => {
    const result = await pool.query("SELECT * FROM filmek");
    res.json(result.rows);
});

app.listen(3000, () => {
    console.log("Szerver fut: http://localhost:3000");
});