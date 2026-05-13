// tests/api.test.js
const request = require("supertest");
const path = require("path");
const fs = require("fs");

process.env.JWT_SECRET = "test_secret_key";
process.env.DB_PATH = "./test_mozifoglalo.db";

const app = require("../src/app");
const { closeDb } = require("../src/db/connection");

const DB_FILE = path.resolve(process.env.DB_PATH);

afterAll(() => {
  closeDb();
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
});

describe("POST /auth/regisztracio", () => {
  it("sikeres regisztráció érvényes adatokkal", async () => {
    const res = await request(app).post("/auth/regisztracio").send({
      nev: "Teszt Felhasználó",
      email: "teszt@example.com",
      jelszo: "jelszo123",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.felhasznalo.email).toBe("teszt@example.com");
  });

  it("hibás e-mail esetén 400-as visszatérés", async () => {
    const res = await request(app).post("/auth/regisztracio").send({
      nev: "Valaki",
      email: "nem-email",
      jelszo: "jelszo123",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("hibak");
  });

  it("duplikált e-mail esetén 409-es visszatérés", async () => {
    await request(app).post("/auth/regisztracio").send({
      nev: "Első",
      email: "duplikat@example.com",
      jelszo: "jelszo123",
    });
    const res = await request(app).post("/auth/regisztracio").send({
      nev: "Második",
      email: "duplikat@example.com",
      jelszo: "masikjelszo",
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /auth/bejelentkezes", () => {
  beforeAll(async () => {
    await request(app).post("/auth/regisztracio").send({
      nev: "Login Teszt",
      email: "login@example.com",
      jelszo: "jelszo123",
    });
  });

  it("sikeres bejelentkezés érvényes adatokkal", async () => {
    const res = await request(app).post("/auth/bejelentkezes").send({
      email: "login@example.com",
      jelszo: "jelszo123",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("hibás jelszó esetén 401-es visszatérés", async () => {
    const res = await request(app).post("/auth/bejelentkezes").send({
      email: "login@example.com",
      jelszo: "rosszjelszo",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /filmek", () => {
  it("visszaadja a filmek listáját", async () => {
    const res = await request(app).get("/filmek");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("GET /filmek/:id", () => {
  it("visszaadja az első film adatait vetítésekkel", async () => {
    const res = await request(app).get("/filmek/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cim");
    expect(res.body).toHaveProperty("vetitesek");
  });

  it("nem létező film esetén 404-es visszatérés", async () => {
    const res = await request(app).get("/filmek/99999");
    expect(res.status).toBe(404);
  });
});

describe("Foglalások (auth szükséges)", () => {
  let token;

  beforeAll(async () => {
    await request(app).post("/auth/regisztracio").send({
      nev: "Foglaló Felhasználó",
      email: "foglalo@example.com",
      jelszo: "jelszo123",
    });
    const loginRes = await request(app).post("/auth/bejelentkezes").send({
      email: "foglalo@example.com",
      jelszo: "jelszo123",
    });
    token = loginRes.body.token;
  });

  it("token nélkül 401-es visszatérés", async () => {
    const res = await request(app).get("/foglalasok");
    expect(res.status).toBe(401);
  });

  it("érvényes tokennel lekérhetők a foglalások", async () => {
    const res = await request(app)
      .get("/foglalasok")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("új foglalás létrehozható", async () => {
    const res = await request(app)
      .post("/foglalasok")
      .set("Authorization", `Bearer ${token}`)
      .send({ vetites_id: 1, szekek: ["A1", "A2"] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });
});

describe("POST /rendeles", () => {
  let token;

  beforeAll(async () => {
    const reg = await request(app).post("/auth/regisztracio").send({
      nev: "Rendelő User",
      email: "rendelo@example.com",
      jelszo: "jelszo123",
    });
    token = reg.body.token;
  });

  it("érvényes rendelés leadható", async () => {
    const res = await request(app)
      .post("/rendeles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tetelek: [
          { id: 1, nev: "Sós popcorn", ar: 1290, mennyiseg: 2 },
          { id: 6, nev: "Üdítők", ar: 990, mennyiseg: 1 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.osszeg).toBe(3570);
  });

  it("üres rendelés esetén 400-as visszatérés", async () => {
    const res = await request(app)
      .post("/rendeles")
      .set("Authorization", `Bearer ${token}`)
      .send({ tetelek: [] });
    expect(res.status).toBe(400);
  });
});