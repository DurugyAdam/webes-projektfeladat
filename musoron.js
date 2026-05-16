// musoron.js – Műsoron oldal teljes logikája

const ALAP_ARAK = {
    "2D": 3500, "3D": 4000, "IMAX": 5000, "4DX": 5500,
    "Feliratos": 3500, "Szinkronos": 3500, "Eredeti nyelv": 3500
};

const KUPONOK = {
    "DIAK":      { tipus: "fix",      ertek: 1800, nev: "Diák kedvezmény",     limit: null, csakKedd: false },
    "WELCOME10": { tipus: "szazalek", ertek: 10,   nev: "10% Date Night",      limit: 2,    csakKedd: false },
    "MOVIE50":   { tipus: "szazalek", ertek: 50,   nev: "50% Romantikus este", limit: 2,    csakKedd: false },
    "KEDD20":    { tipus: "szazalek", ertek: 20,   nev: "Keddi mozinap -20%",  limit: null, csakKedd: true  },
};

const SORAZONOSITOK = ["A","B","C","D","E","F","G","H","I","J"];
const NAPOK   = ["V","H","K","Sze","Cs","P","Szo"];
const HONAPOK = ["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"];

const FILMEK = [
    { id:1,  cim:"Galaktikus Küldetés",    mufaj:"Sci-fi",      ido:"2ó 15p", kor:"12+", kep:"képek/Galaktikus_küldetés.png",    vetitesek:{ "2D":["13:00","16:30","21:10"],"3D":["18:45"],"IMAX":["15:00","20:00"] } },
    { id:2,  cim:"Éjszaka a Város Felett", mufaj:"Thriller",    ido:"1ó 48p", kor:"16+", kep:"képek/éjszaka a város velett.png", vetitesek:{ "2D":["17:00","22:00"],"Feliratos":["19:30"] } },
    { id:3,  cim:"Családi Kalandpark",     mufaj:"Családi",     ido:"1ó 35p", kor:"6+",  kep:"képek/családi_kalandpark.png",     vetitesek:{ "3D":["10:00","14:00"],"Szinkronos":["12:00","16:15"] } },
    { id:4,  cim:"Utolsó Esély",           mufaj:"Akció",       ido:"2ó 5p",  kor:"16+", kep:"képek/utolsó_esély.png",           vetitesek:{ "2D":["20:00","22:30"],"Eredeti nyelv":["18:00"] } },
    { id:5,  cim:"Mélységek Titka",        mufaj:"Dráma",       ido:"1ó 52p", kor:"12+", kep:"képek/Mélységek Titka.png",        vetitesek:{ "2D":["15:00","17:30"],"Feliratos":["20:00"] } },
    { id:6,  cim:"Vérhold",               mufaj:"Horror",      ido:"1ó 45p", kor:"18+", kep:"képek/Vérhold.png",                vetitesek:{ "2D":["21:00","23:00"] } },
    { id:7,  cim:"Az Erdő Szelleme",      mufaj:"Animáció",    ido:"1ó 28p", kor:"6+",  kep:"képek/Az Erdő Szelleme.png",       vetitesek:{ "3D":["10:00","12:30"],"Szinkronos":["15:00"] } },
    { id:8,  cim:"Sivatagi Vihar",        mufaj:"Western",     ido:"2ó 10p", kor:"16+", kep:"képek/Sivatagi Vihar.png",         vetitesek:{ "2D":["16:00","18:30"],"Feliratos":["21:00"] } },
    { id:9,  cim:"Kvantumcsapda",         mufaj:"Sci-fi",      ido:"2ó 20p", kor:"12+", kep:"képek/Kvantumcsapda.png",          vetitesek:{ "IMAX":["17:00","20:30"],"3D":["14:30"] } },
    { id:10, cim:"Jeges Szívek",          mufaj:"Romantikus",  ido:"1ó 55p", kor:"12+", kep:"képek/Jeges Szívek.png",           vetitesek:{ "2D":["14:30","17:00"],"Szinkronos":["19:30"] } },
    { id:11, cim:"Arany Kalitka",         mufaj:"Dráma",       ido:"2ó 5p",  kor:"16+", kep:"képek/Arany Kalitka.png",          vetitesek:{ "2D":["18:00","20:30"],"Feliratos":["16:00"] } },
    { id:12, cim:"Csillagközi Nomád",     mufaj:"Sci-fi",      ido:"2ó 30p", kor:"12+", kep:"képek/Csillagközi Nomád.png",      vetitesek:{ "IMAX":["19:00","22:00"],"4DX":["17:00"] } },
    { id:13, cim:"Bíbor Maszk",           mufaj:"Akció",       ido:"1ó 58p", kor:"16+", kep:"képek/Bíbor Maszk.png",            vetitesek:{ "2D":["15:30","20:30"],"3D":["18:00"] } },
    { id:14, cim:"Óceán Hangjai",         mufaj:"Dokumentum",  ido:"1ó 40p", kor:"6+",  kep:"képek/Óceán Hangjai.png",          vetitesek:{ "2D":["11:00","13:30"],"Feliratos":["16:00"] } },
];

// ── Állapot ───────────────────────────────────────────────────
let kivalasztottNap = new Date().toISOString().slice(0, 10);
let modalKivalasztott = new Set();
let modalKuponok = new Set();

function isKeddMa() {
    return new Date().getDay() === 2;
}

function isKivalasztottNapKedd() {
    return new Date(kivalasztottNap).getDay() === 2;
}

// ── Nap sáv ───────────────────────────────────────────────────
function buildDayBar() {
    const bar = document.getElementById("dayBar");
    const ma  = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(ma);
        d.setDate(ma.getDate() + i);
        const datum = d.toISOString().slice(0, 10);
        const btn = document.createElement("button");
        btn.className = "day-btn" + (i === 0 ? " active" : "");
        btn.innerHTML = `
            <span class="day-name">${i === 0 ? "Ma" : NAPOK[d.getDay()]}</span>
            <span class="day-num">${d.getDate()}</span>
            <span class="day-month">${HONAPOK[d.getMonth()]}</span>
        `;
        btn.addEventListener("click", () => {
            document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            kivalasztottNap = datum;
        });
        bar.appendChild(btn);
    }
}

// ── Film lista ────────────────────────────────────────────────
function renderFilmek() {
    const lista = document.getElementById("filmLista");
    lista.innerHTML = "";
    FILMEK.forEach(film => {
        const sor = document.createElement("div");
        sor.className = "film-sor";

        const plakat = document.createElement("div");
        plakat.className = "film-plakat";
        if (film.kep) {
            plakat.style.cssText = "width:90px;min-height:130px;flex-shrink:0;overflow:hidden;padding:0;";
            plakat.innerHTML = `<img src="${film.kep}" alt="${film.cim}" 
                style="width:100%;height:100%;min-height:130px;object-fit:cover;object-position:center top;display:block;"
                onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:130px;display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:0.35;\\'>🎬</div>'">`;
        } else {
            plakat.innerHTML = `<div style="width:100%;height:130px;display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:0.35;">🎬</div>`;
        }
        sor.appendChild(plakat);

        const tagsHtml = Object.keys(film.vetitesek).map(f =>
            `<span class="film-tag${f === "IMAX" ? " imax" : f === "4DX" ? " x4d" : ""}">${f}</span>`
        ).join("");

        const vetitesekHtml = Object.entries(film.vetitesek).map(([fmt, idok]) => `
            <div class="vetites-blokk">
                <div class="vetites-formatum">${fmt}</div>
                <div class="idopont-gombok">
                    ${idok.map(t =>
                        `<button onclick="nyissModal(${film.id},'${t}','${fmt}','${film.cim}')"
                            class="idopont-gomb${fmt === "IMAX" ? " imax-gomb" : ""}">${t}</button>`
                    ).join("")}
                </div>
            </div>`).join("");

        const info = document.createElement("div");
        info.className = "film-info";
        info.innerHTML = `
            <div class="film-fejlec">
                <div>
                    <div class="film-cim">${film.cim}</div>
                    <div class="film-meta-sor">
                        <span>${film.mufaj}</span><span class="dot"></span>
                        <span>${film.ido}</span><span class="dot"></span>
                        <span style="display:flex;gap:0.3rem;flex-wrap:wrap;">${tagsHtml}</span>
                    </div>
                </div>
                <span class="kor-badge">${film.kor}</span>
            </div>
            <div class="vetites-blokkok">${vetitesekHtml}</div>`;
        sor.appendChild(info);
        lista.appendChild(sor);
    });
}

// ── Visszavonás confirm modal ─────────────────────────────────
function visszavonasModal(azon, onConfirm) {
    const meglevo = document.getElementById("visszavonasModalEl");
    if (meglevo) meglevo.remove();
    const m = document.createElement("div");
    m.id = "visszavonasModalEl";
    m.style.cssText = "position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:1rem;";
    m.innerHTML = `
        <div style="background:#0f1628;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:1.75rem;width:100%;max-width:340px;text-align:center;">
            <div style="font-size:2rem;margin-bottom:0.75rem;">🪑</div>
            <div style="font-size:1rem;font-weight:700;margin-bottom:0.4rem;">Foglalás visszavonása</div>
            <div style="font-size:0.85rem;color:#b3b3b3;margin-bottom:1.5rem;">
                Biztosan visszavonod a(z) <strong style="color:#fff;">${azon}</strong> szék foglalását?
            </div>
            <div style="display:flex;gap:0.75rem;">
                <button id="vNem" style="flex:1;padding:0.7rem;border-radius:999px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#fff;font-size:0.85rem;cursor:pointer;">Mégse</button>
                <button id="vIgen" style="flex:1;padding:0.7rem;border-radius:999px;border:none;background:linear-gradient(135deg,#ff6b6b,#ff4444);color:#fff;font-size:0.85rem;font-weight:700;cursor:pointer;">Visszavon</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    m.addEventListener("click", e => { if (e.target === m) m.remove(); });
    document.getElementById("vNem").addEventListener("click", () => m.remove());
    document.getElementById("vIgen").addEventListener("click", () => { m.remove(); onConfirm(); });
}

// ── Modal megnyitás ───────────────────────────────────────────
async function nyissModal(filmId, idopont, formatum, filmCim) {
    modalKivalasztott = new Set();
    modalKuponok = new Set();

    const teljesIdopont = kivalasztottNap + " " + idopont;

    let foglaltSzekek = new Set();
    let tiltottSzekek = new Set();
    let sajatSzekek   = [];

    try {
        const res = await fetch(
            `${API}/foglalasok/szekek?film_id=${filmId}&idopont=${encodeURIComponent(teljesIdopont)}&formatum=${encodeURIComponent(formatum)}`,
            { headers: localStorage.getItem("mozi_token") ? { "Authorization": "Bearer " + localStorage.getItem("mozi_token") } : {} }
        );
        if (res.ok) {
            const data = await res.json();
            data.foglalt.forEach(s => foglaltSzekek.add(s));
            data.tiltott.forEach(s => tiltottSzekek.add(s));
            sajatSzekek = data.sajat || [];
        }
    } catch {}

    const sajatSzekAzonositok = new Set(sajatSzekek.map(s => s.szek));
    const isKedd = isKivalasztottNapKedd();
    const alapAr = ALAP_ARAK[formatum] || 3500;
    const user   = typeof getUser === "function" ? getUser() : null;
    const isAdmin = user && user.szerep === "admin";

    // Kupon egyenleg
    const kuponEgyenleg = {};
    if (user) {
        Object.entries(KUPONOK).forEach(([kod, k]) => {
            if (k.csakKedd && !isKedd) return;
            const n = parseInt(localStorage.getItem(`kupon_hasznalt_${user.id}_${kod}`) || "0");
            kuponEgyenleg[kod] = k.limit === null ? "∞" : Math.max(0, k.limit - n);
        });
    }

    const modal = document.createElement("div");
    modal.className = "modal-hatter";
    modal.innerHTML = `
        <div class="modal-doboz">
            <button class="modal-bezar" id="modalBezar">×</button>
            <div class="siker-box" id="modalSiker">
                <div class="siker-ikon">🎉</div>
                <div class="siker-cim">Foglalás sikeres!</div>
                <div class="siker-szov">Jegyeid le lettek foglalva.<br>A pénztárnál add meg a neved vagy e-mail címed.</div>
                <button class="vissza-btn" id="modalVissza">Bezárás</button>
            </div>
            <div id="modalTartalom">
                <div class="modal-cim">${filmCim}</div>
                <div class="modal-alcim">
                    ${formatum} • ${kivalasztottNap} ${idopont}
                    ${isKedd ? '<span class="kedv-badge">🎉 Keddi nap</span>' : ''}
                    ${isAdmin ? '<span style="padding:0.1rem 0.45rem;border-radius:5px;background:rgba(100,200,255,0.1);border:1px solid rgba(100,200,255,0.3);color:#64c8ff;font-size:0.72rem;font-weight:700;margin-left:0.4rem;">ADMIN</span>' : ''}
                </div>
                <div class="vaszon">🎬 Vászon</div>
                <div class="szek-map-container"><div class="szek-map" id="modalSzekMap"></div></div>
                <div class="jelmagyard">
                    <div class="jelmagyard-item"><div class="jelmagyard-szek szabad"></div> Szabad</div>
                    <div class="jelmagyard-item"><div class="jelmagyard-szek kiv"></div> Kiválasztott</div>
                    <div class="jelmagyard-item"><div class="jelmagyard-szek fog"></div> Foglalt</div>
                    <div class="jelmagyard-item"><div class="jelmagyard-szek tilt"></div> Tiltott</div>
                    <div class="jelmagyard-item"><div class="jelmagyard-szek" style="background:rgba(100,200,255,0.2);border-color:rgba(100,200,255,0.5);"></div> Saját</div>
                </div>
                <div class="osszesito">
                    <div class="osszesito-cim">Összesítő</div>
                    ${user ? `
                    <div class="kupon-sor">
                        <input class="kupon-input" id="modalKuponInput" type="text" placeholder="Kuponkód hozzáadása">
                        <button class="kupon-btn" id="modalKuponBtn">Hozzáad</button>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-muted);margin-bottom:0.5rem;display:flex;gap:0.4rem;flex-wrap:wrap;">
                        ${Object.entries(kuponEgyenleg).map(([kod, db]) => {
                            const el = db === 0;
                            return `<span style="padding:0.15rem 0.5rem;border-radius:999px;border:1px solid ${el ? "rgba(255,255,255,0.1)" : "rgba(247,147,30,0.3)"};background:${el ? "rgba(255,255,255,0.03)" : "rgba(247,147,30,0.08)"};color:${el ? "rgba(255,255,255,0.3)" : "#ffb347"};cursor:${el ? "default" : "pointer"};${el ? "text-decoration:line-through;" : ""}"
                                ${!el ? `onclick="document.getElementById('modalKuponInput').value='${kod}'"` : ""}>
                                ${kod} (${db}x)</span>`;
                        }).join("")}
                    </div>
                    <div id="aktivKuponok" style="font-size:0.73rem;color:#4caf50;margin-bottom:0.5rem;display:none;"></div>
                    <div class="kupon-uzenet" id="modalKuponUzenet"></div>
                    ` : ""}
                    <div class="osszesito-sorok" id="modalOsszesitoSorok">
                        <div class="osszesito-sor"><span>Nincs kiválasztott szék</span><span>–</span></div>
                    </div>
                    <div class="login-warn" id="modalLoginWarn">
                        A foglaláshoz <a id="modalLoginLink">be kell jelentkezned</a>.
                    </div>
                    <button class="foglalas-btn" id="modalFoglalasBtn" disabled>Jegyek foglalása</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // ── Szék térkép ───────────────────────────────────────────
    const map = document.getElementById("modalSzekMap");
    for (let s = 0; s < 10; s++) {
        const sor = document.createElement("div"); sor.className = "szek-sor";
        const lbl = document.createElement("div"); lbl.className = "sor-label"; lbl.textContent = SORAZONOSITOK[s];
        sor.appendChild(lbl);

        for (let o = 0; o < 15; o++) {
            const azon = `${SORAZONOSITOK[s]}${o + 1}`;
            const szek = document.createElement("div");
            szek.className = "szek"; szek.title = azon; szek.textContent = o + 1;

            if (tiltottSzekek.has(azon)) {
                szek.classList.add("tiltott");

            } else if (sajatSzekAzonositok.has(azon)) {
                szek.style.cssText = "background:rgba(100,200,255,0.2);border-color:rgba(100,200,255,0.5);color:#64c8ff;";
                szek.title = `${azon} – Saját (visszavonható)`;
                szek.addEventListener("click", () => {
                    const foglalas = sajatSzekek.find(x => x.szek === azon);
                    if (!foglalas) return;
                    visszavonasModal(azon, async () => {
                        try {
                            const r = await fetch(`${API}/foglalasok/${foglalas.foglalas_id}`, {
                                method: "DELETE",
                                headers: { "Authorization": "Bearer " + localStorage.getItem("mozi_token") }
                            });
                            if (r.ok) {
                                szek.style.cssText = "";
                                szek.title = azon;
                                sajatSzekek = sajatSzekek.filter(x => x.szek !== azon);
                                sajatSzekAzonositok.delete(azon);
                                szek.addEventListener("click", () => {
                                    if (!modalKivalasztott.has(azon) && modalKivalasztott.size + sajatSzekek.length >= 8) {
                                        alert("Maximum 8 helyet foglalhatsz!"); return;
                                    }
                                    if (modalKivalasztott.has(azon)) { modalKivalasztott.delete(azon); szek.classList.remove("kivalasztott"); }
                                    else { modalKivalasztott.add(azon); szek.classList.add("kivalasztott"); }
                                    frissitModalOsszesito(alapAr, isKedd);
                                });
                            } else { const d = await r.json(); alert(d.error || "Hiba."); }
                        } catch { alert("Szerverhiba."); }
                    });
                });

            } else if (foglaltSzekek.has(azon)) {
                szek.classList.add("foglalt");
                if (isAdmin) {
                    szek.style.cursor = "pointer";
                    szek.title = `${azon} – Admin: kattints a visszavonáshoz`;
                    szek.addEventListener("click", () => {
                        visszavonasModal(azon, async () => {
                            try {
                                const foglRes = await fetch(`${API}/admin/foglalasok`, {
                                    headers: { "Authorization": "Bearer " + localStorage.getItem("mozi_token") }
                                });
                                if (!foglRes.ok) { alert("Nem sikerült lekérni a foglalásokat."); return; }
                                const osszes = await foglRes.json();
                                const talalat = osszes.find(f =>
                                    String(f.film_id) === String(filmId) &&
                                    f.idopont === teljesIdopont &&
                                    f.formatum === formatum &&
                                    f.allapot === "aktiv" &&
                                    f.szekek.includes(azon)
                                );
                                if (!talalat) { alert("Nem található a foglalás."); return; }
                                const r = await fetch(`${API}/foglalasok/admin/${talalat.id}`, {
                                    method: "DELETE",
                                    headers: { "Authorization": "Bearer " + localStorage.getItem("mozi_token") }
                                });
                                if (r.ok) {
                                    szek.classList.remove("foglalt");
                                    szek.style.cursor = "";
                                    szek.title = azon;
                                    foglaltSzekek.delete(azon);
                                } else { const d = await r.json(); alert(d.error || "Hiba."); }
                            } catch { alert("Szerverhiba."); }
                        });
                    });
                }

            } else {
                szek.addEventListener("click", () => {
                    if (!modalKivalasztott.has(azon) && modalKivalasztott.size + sajatSzekek.length >= 8) {
                        alert("Maximum 8 helyet foglalhatsz!"); return;
                    }
                    if (modalKivalasztott.has(azon)) { modalKivalasztott.delete(azon); szek.classList.remove("kivalasztott"); }
                    else { modalKivalasztott.add(azon); szek.classList.add("kivalasztott"); }
                    frissitModalOsszesito(alapAr, isKedd);
                });
            }
            sor.appendChild(szek);
        }
        map.appendChild(sor);
    }

    // ── Eseménykezelők ────────────────────────────────────────
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    document.getElementById("modalBezar").addEventListener("click", () => modal.remove());
    document.getElementById("modalVissza")?.addEventListener("click", () => modal.remove());
    document.getElementById("modalLoginLink")?.addEventListener("click", () => {
        modal.remove(); document.querySelector(".nav-btn.secondary")?.click();
    });

    // Kupon beváltás
    document.getElementById("modalKuponBtn")?.addEventListener("click", () => {
        const kod = document.getElementById("modalKuponInput").value.trim().toUpperCase();
        const uzenet = document.getElementById("modalKuponUzenet");

        if (!KUPONOK[kod]) {
            uzenet.textContent = "Érvénytelen kuponkód.";
            uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return;
        }
        if (KUPONOK[kod].csakKedd && !isKedd) {
            uzenet.textContent = "Ez a kupon csak kedden érvényes!";
            uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return;
        }
        if (modalKuponok.has(kod)) {
            uzenet.textContent = "Ezt a kupont már hozzáadtad.";
            uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return;
        }
        if (user && KUPONOK[kod].limit !== null) {
            const n = parseInt(localStorage.getItem(`kupon_hasznalt_${user.id}_${kod}`) || "0");
            if (n >= KUPONOK[kod].limit) {
                uzenet.textContent = `Kupont már felhasználtad (${n}/${KUPONOK[kod].limit}).`;
                uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return;
            }
        }

        modalKuponok.add(kod);
        document.getElementById("modalKuponInput").value = "";
        uzenet.textContent = `✓ ${KUPONOK[kod].nev} hozzáadva!`;
        uzenet.className = "kupon-uzenet ok"; uzenet.style.display = "block";

        // Aktív kuponok megjelenítése
        const aktivEl = document.getElementById("aktivKuponok");
        if (aktivEl) {
            aktivEl.style.display = "block";
            aktivEl.textContent = "Aktív kuponok: " + [...modalKuponok].map(k => KUPONOK[k].nev).join(", ");
        }

        frissitModalOsszesito(alapAr, isKedd);
    });

    // Foglalás gomb
    document.getElementById("modalFoglalasBtn")?.addEventListener("click", async () => {
        const u = typeof getUser === "function" ? getUser() : null;
        if (!u || modalKivalasztott.size === 0) return;
        const btn = document.getElementById("modalFoglalasBtn");
        btn.disabled = true; btn.textContent = "Feldolgozás…";
        try {
            const res = await fetch(`${API}/foglalasok`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("mozi_token") },
                body: JSON.stringify({
                    vetites_id: filmId,
                    szekek: [...modalKivalasztott],
                    film_id: filmId,
                    idopont: teljesIdopont,
                    formatum
                }),
            });
            if (res.ok) {
                // Kupon használatok mentése
                modalKuponok.forEach(kod => {
                    const key = `kupon_hasznalt_${u.id}_${kod}`;
                    localStorage.setItem(key, String(parseInt(localStorage.getItem(key) || "0") + 1));
                });
                document.getElementById("modalTartalom").style.display = "none";
                document.getElementById("modalSiker").style.display = "block";
            } else {
                const d = await res.json();
                alert(d.error || "Hiba történt.");
                btn.disabled = false; btn.textContent = "Jegyek foglalása";
            }
        } catch {
            alert("Szerverhiba.");
            btn.disabled = false; btn.textContent = "Jegyek foglalása";
        }
    });

    frissitModalOsszesito(alapAr, isKedd);
}

// ── Összesítő frissítés ───────────────────────────────────────
function frissitModalOsszesito(alapAr, isKedd) {
    const sorok  = document.getElementById("modalOsszesitoSorok");
    const btn    = document.getElementById("modalFoglalasBtn");
    const loginW = document.getElementById("modalLoginWarn");
    const darab  = modalKivalasztott.size;

    if (darab === 0) {
        sorok.innerHTML = `<div class="osszesito-sor"><span>Nincs kiválasztott szék</span><span>–</span></div>`;
        if (btn) btn.disabled = true; return;
    }

    let egyseg = alapAr;
    let kedvNevek = [];

    // Keddi kedvezmény ha nincs más kupon
    if (isKedd && modalKuponok.size === 0) {
        egyseg = Math.round(egyseg * 0.8);
        kedvNevek.push("Keddi -20%");
    }

    // Kuponok alkalmazása sorban
    modalKuponok.forEach(kod => {
        const k = KUPONOK[kod];
        if (k.tipus === "fix") {
            egyseg = Math.min(egyseg, k.ertek);
        } else {
            egyseg = Math.round(egyseg * (1 - k.ertek / 100));
        }
        kedvNevek.push(k.nev);
    });

    // Családi kedvezmény ha nincs kupon és nem kedd
    if (darab >= 4 && modalKuponok.size === 0 && !isKedd) {
        egyseg = Math.round(egyseg * 0.85);
        kedvNevek.push("Családi -15%");
    }

    const osszeg = egyseg * darab;
    const ft = n => n.toLocaleString("hu-HU") + " Ft";
    const szekLista = [...modalKivalasztott].sort().join(", ");

    let html = `
        <div class="osszesito-sor"><span>Kiválasztott székek</span><span style="color:#fff;">${szekLista}</span></div>
        <div class="osszesito-sor"><span>Alapár / jegy</span><span>${ft(alapAr)}</span></div>`;

    if (kedvNevek.length > 0) {
        html += `<div class="osszesito-sor" style="color:#4caf50;"><span>Kedvezmény <span class="kedv-badge">${kedvNevek.join(" + ")}</span></span><span>${ft(egyseg)}/jegy</span></div>`;
    }

    html += `
        <div class="osszesito-sor"><span>${darab} db × ${ft(egyseg)}</span><span></span></div>
        <div class="osszesito-sor total"><span>Összesen</span><span>${ft(osszeg)}</span></div>`;
    sorok.innerHTML = html;

    const u = typeof getUser === "function" ? getUser() : null;
    if (!u) { if (loginW) loginW.style.display = "block"; if (btn) btn.disabled = true; }
    else    { if (loginW) loginW.style.display = "none";  if (btn) btn.disabled = false; }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    buildDayBar();
    renderFilmek();
});