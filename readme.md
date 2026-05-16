# 🎬 MOZIFoglaló – Online Jegyfoglaló Rendszer

Webalapú mozijegy-foglaló alkalmazás, amellyel filmeket lehet böngészni, helyeket lehet foglalni a moziteremben, kuponokat lehet beváltani olcsóbb jegyárakért, és felhasználói fiókkal be lehet jelentkezni a foglalások nyomon követéséhez.

---

## 📋 Tartalomjegyzék

- [Követelmények](#követelmények)
- [Telepítés és indítás](#telepítés-és-indítás)
- [Bejelentkezési adatok](#bejelentkezési-adatok)
- [API végpontok](#api-végpontok)
- [Projekt struktúra](#projekt-struktúra)

---

## Követelmények

- [Node.js](https://nodejs.org) (v18 vagy újabb)
- Webböngésző (Chrome, Firefox, Edge)

---

## Telepítés és indítás

### 1. lépés – Fájlok letöltése

Töltsd le vagy klónozd a projektet:

```bash
git clone https://github.com/felhasznalonev/mozifoglalo.git
cd mozifoglalo
```

### 2. lépés – Backend függőségek telepítése

```bash
cd backend
npm install
```

### 3. lépés – Környezeti változók beállítása

A `backend` mappában hozz létre egy `.env` fájlt:

```
PORT=3000
JWT_SECRET=valtozd_meg_eles_kornyezetben_!
NODE_ENV=development
DB_PATH=./mozifoglalo.db
```

### 4. lépés – Backend szerver indítása

```bash
node src/app.js
```

A szerver elindul: `http://localhost:3000`

### 5. lépés – Frontend megnyitása

Nyisd meg a `műsoron.html` fájlt egy **Live Server** segítségével:

- VS Code-ban telepítsd a **Live Server** extension-t
- Jobb klikk a `műsoron.html`-re → **Open with Live Server**
- A böngésző megnyitja: `http://127.0.0.1:5500/műsoron.html`

> **Fontos:** Egyszerű dupla kattintással (`file://`) megnyitva a foglalás nem fog működni, mert a böngésző biztonsági okokból blokkolja a külső JS fájlok betöltését. Live Server szükséges!

---

## Bejelentkezési adatok

| Felhasználó | Email | Jelszó |
|-------------|-------|--------|
| Admin | admin@mozifoglalo.hu | Admin1234! |
| Normál user | regisztrálj az oldalon | - |

---

## API végpontok

### Autentikáció

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| POST | `/auth/regisztracio` | Új felhasználó regisztrálása |
| POST | `/auth/bejelentkezes` | Bejelentkezés, JWT token visszaadása |

### Filmek

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| GET | `/filmek` | Összes aktív film listázása |
| GET | `/filmek/:id` | Egy film részletei + vetítései |
| POST | `/filmek` | Új film hozzáadása (csak admin) |
| DELETE | `/filmek/:id` | Film törlése (csak admin) |

### Vetítések

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| GET | `/vetitesek` | Összes vetítés listázása |
| GET | `/vetitesek/:id` | Egy vetítés részletei + foglalt székek |
| POST | `/vetitesek` | Új vetítés hozzáadása (csak admin) |

### Foglalások

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| GET | `/foglalasok` | Saját foglalások listázása |
| GET | `/foglalasok/szekek` | Foglalt/tiltott/saját székek lekérése |
| POST | `/foglalasok` | Új foglalás létrehozása |
| DELETE | `/foglalasok/:id` | Foglalás lemondása |
| DELETE | `/foglalasok/admin/:id` | Bármely foglalás lemondása (csak admin) |

### Rendelések

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| POST | `/rendeles` | Étel/ital rendelés leadása |
| GET | `/rendeles` | Saját rendelések listázása |

### Admin

| Metódus | Végpont | Leírás |
|---------|---------|--------|
| GET | `/admin/foglalasok` | Összes foglalás listázása |
| GET | `/admin/szekek` | Tiltott székek listázása |
| POST | `/admin/szekek/tilt` | Székek tiltása |
| POST | `/admin/szekek/szabadit` | Székek felszabadítása |

---

## Projekt struktúra

```
mozifoglalo/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express alkalmazás belépési pont
│   │   ├── db/
│   │   │   ├── init.js         # Adatbázis inicializálás + seed adatok
│   │   │   └── connection.js   # Adatbázis kapcsolat singleton
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT autentikáció middleware
│   │   └── routes/
│   │       ├── auth.js         # Regisztráció és bejelentkezés
│   │       ├── filmek.js       # Filmek kezelése
│   │       ├── vetitesek.js    # Vetítések kezelése
│   │       ├── foglalasok.js   # Foglalások kezelése
│   │       ├── rendelesek.js   # Rendelések kezelése
│   │       └── admin.js        # Admin funkciók
│   ├── tests/
│   │   └── api.test.js         # Integrációs tesztek
│   ├── .env                    # Környezeti változók (ne töltsd fel GitHub-ra!)
│   ├── package.json
│   └── Dockerfile
├── képek/                      # Film és ajánlat képek
├── műsoron.html                # Főoldal – filmek és foglalás
├── ajanlatok.html              # Ajánlatok és kuponok
├── étel_ital.html              # Étel és ital menü
├── auth.js                     # Frontend autentikáció
├── musoron.js                  # Műsoron oldal logikája
├── musoron.css                 # Műsoron oldal stílusai
├── main_page.css               # Globális stílusok
└── README.md
```

---

## Opcionális funkciók

- ✅ **Autentikáció (JWT)** – Felhasználói regisztráció és bejelentkezés JWT tokennel
- ✅ **Konténerizáció (Docker)** – Dockerfile és docker-compose.yml megtalálható a `backend` mappában

### Docker indítás (alternatív)

```bash
cd backend
docker-compose up
```

---

## Tesztek futtatása

```bash
cd backend
npm test
```