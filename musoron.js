// musoron.js – Műsoron oldal teljes logikája

// Állapot
let ALAP_ARAK = {};
let KUPONOK = {};
let FILMEK = [];
let kivalasztottNap = new Date().toISOString().slice(0, 10);
let modalKivalasztott = new Set();
let modalKuponok = new Set();

// Szűrő állapot
let szuroMufaj    = new Set();
let szuroFormatum = new Set();
let szuroNyelv    = new Set();

const SORAZONOSITOK = ["A","B","C","D","E","F","G","H","I","J"];
const NAPOK   = ["V","H","K","Sze","Cs","P","Szo"];
const HONAPOK = ["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"];

function isKeddMa() { return new Date().getDay() === 2; }
function isKivalasztottNapKedd() { return new Date(kivalasztottNap + "T12:00:00").getDay() === 2; }

// ── Adatok betöltése backendről ───────────────────────────────
async function betoltAdatok() {
    try {
        const [filmRes, arRes, kuponRes] = await Promise.all([
            fetch(`${API}/filmek`),
            fetch(`${API}/kuponok/arak`),
            fetch(`${API}/kuponok`),
        ]);
        if (filmRes.ok)  FILMEK    = await filmRes.json();
        if (arRes.ok)    ALAP_ARAK = await arRes.json();
        if (kuponRes.ok) {
            const lista = await kuponRes.json();
            lista.forEach(k => {
                KUPONOK[k.kod] = { tipus: k.tipus, ertek: k.ertek, nev: k.nev, limit: k.limit_db, csakKedd: k.csak_kedd === 1 };
            });
        }
    } catch (e) { console.error("Adatok betöltése sikertelen:", e); }

    buildDayBar();
    buildSzuro();
    renderFilmek();
}
function nyissFilmInfo(filmId) {
    const film = FILMEK.find(f => f.id === filmId);
    if (!film) return;

    const meglevo = document.getElementById("filmInfoModal");
    if (meglevo) meglevo.remove();

    const m = document.createElement("div");
    m.id = "filmInfoModal";
    m.style.cssText = "position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:1rem;";

    const ido = film.idotartam ? `${Math.floor(film.idotartam/60)} óra ${film.idotartam%60} perc` : "–";

    m.innerHTML = `
        <div style="background:#0f1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;position:relative;">
            <button id="filmInfoBezar" style="position:absolute;top:1rem;right:1rem;background:transparent;border:none;color:rgba(255,255,255,0.35);font-size:1.5rem;cursor:pointer;line-height:1;">×</button>

            ${film.kep_url ? `
            <div style="width:100%;border-radius:16px 16px 0 0;overflow:hidden;">
                <img src="${film.kep_url}" alt="${film.cim}" style="width:100%;height:auto;display:block;">
            </div>` : `
            <div style="width:100%;height:120px;background:linear-gradient(135deg,#f7931e,#ff6f00);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:center;font-size:3rem;">🎬</div>`}

            <div style="padding:1.5rem;">
                <div style="font-size:1.15rem;font-weight:700;margin-bottom:0.25rem;">${film.cim}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1rem;">${film.mufaj} • ${ido} • ${film.korcsoport}</div>

                ${film.leiras ? `<p style="font-size:0.85rem;color:#ccc;line-height:1.6;margin-bottom:1.25rem;">${film.leiras}</p>` : ""}

                <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.82rem;border-top:1px solid rgba(255,255,255,0.07);padding-top:1rem;">
                    <div style="display:flex;gap:0.5rem;">
                        <span style="color:var(--text-muted);min-width:110px;">Filmműfaj:</span>
                        <span style="color:#fff;">${film.mufaj}</span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <span style="color:var(--text-muted);min-width:110px;">Időtartam:</span>
                        <span style="color:#fff;">${ido}</span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <span style="color:var(--text-muted);min-width:110px;">Korhatár:</span>
                        <span style="color:#fff;">${film.korcsoport}</span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <span style="color:var(--text-muted);min-width:110px;">Vetítési módok:</span>
                        <span style="color:#fff;">${Object.keys(film.vetitesek || {}).join(", ")}</span>
                    </div>
                </div>

                <button onclick="document.getElementById('filmInfoModal').remove()" style="width:100%;margin-top:1.25rem;padding:0.75rem;border-radius:999px;border:none;background:linear-gradient(135deg,#f7931e,#ffb347);color:#1b1305;font-size:0.88rem;font-weight:700;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;">
                    Bezárás
                </button>
            </div>
        </div>`;

    document.body.appendChild(m);
    m.addEventListener("click", e => { if (e.target === m) m.remove(); });
    document.getElementById("filmInfoBezar").addEventListener("click", () => m.remove());
}
// ── Nap sáv ───────────────────────────────────────────────────
function buildDayBar() {
    const bar = document.getElementById("dayBar");
    bar.innerHTML = "";
    const ma = new Date();
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

// ── Szűrő építése ─────────────────────────────────────────────
function buildSzuro() {
    const wrapper = document.getElementById("szuroWrapper");
    if (!wrapper) return;

    // Egyedi értékek összegyűjtése
    const mufajok    = [...new Set(FILMEK.map(f => f.mufaj))].sort();
    const formatumok = [...new Set(FILMEK.flatMap(f => Object.keys(f.vetitesek || {})))].sort();
    const nyelvek    = ["Szinkronos", "Feliratos", "Eredeti nyelv"].filter(n =>
        formatumok.includes(n)
    );
    const tipusok = formatumok.filter(f => !["Szinkronos","Feliratos","Eredeti nyelv"].includes(f));

    wrapper.innerHTML = `
        <button class="szuro-toggle" id="szuroToggle">
            🔍 Szűrők
            <i class="szuro-toggle-nyil">▼</i>
        </button>
        <div class="szuro-panel" id="szuroPanel">
            <div class="szuro-csoport">
                <div class="szuro-csoport-cim">Műfaj</div>
                <div class="szuro-chip-lista" id="szuroMufajLista">
                    ${mufajok.map(m => `<div class="szuro-chip" data-tipus="mufaj" data-ertek="${m}">${m}</div>`).join("")}
                </div>
            </div>
            <div class="szuro-csoport">
                <div class="szuro-csoport-cim">Előadás típusa</div>
                <div class="szuro-chip-lista" id="szuroFormatumLista">
                    ${tipusok.map(f => `<div class="szuro-chip" data-tipus="formatum" data-ertek="${f}">${f}</div>`).join("")}
                </div>
            </div>
            ${nyelvek.length > 0 ? `
            <div class="szuro-csoport">
                <div class="szuro-csoport-cim">Nyelv</div>
                <div class="szuro-chip-lista" id="szuroNyelvLista">
                    ${nyelvek.map(n => `<div class="szuro-chip" data-tipus="nyelv" data-ertek="${n}">${n}</div>`).join("")}
                </div>
            </div>` : ""}
            <button class="szuro-torles" id="szuroTorles">✕ Szűrők törlése</button>
        </div>
        <div class="szuro-eredmeny" id="szuroEredmeny" style="display:none;"></div>
    `;

    // Toggle
    document.getElementById("szuroToggle").addEventListener("click", () => {
        const toggle = document.getElementById("szuroToggle");
        const panel  = document.getElementById("szuroPanel");
        toggle.classList.toggle("aktiv");
        panel.classList.toggle("nyitva");
    });

    // Chip kattintás
    wrapper.querySelectorAll(".szuro-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const tipus = chip.dataset.tipus;
            const ertek = chip.dataset.ertek;
            chip.classList.toggle("kivalasztott");
            const halmaz = tipus === "mufaj" ? szuroMufaj : tipus === "formatum" ? szuroFormatum : szuroNyelv;
            if (halmaz.has(ertek)) halmaz.delete(ertek);
            else halmaz.add(ertek);
            renderFilmek();
        });
    });

    // Törlés
    document.getElementById("szuroTorles").addEventListener("click", () => {
        szuroMufaj.clear(); szuroFormatum.clear(); szuroNyelv.clear();
        wrapper.querySelectorAll(".szuro-chip").forEach(c => c.classList.remove("kivalasztott"));
        renderFilmek();
    });
}

// ── Szűrt filmek ──────────────────────────────────────────────
function szurtFilmek() {
    return FILMEK.filter(film => {
        // Műfaj szűrő
        if (szuroMufaj.size > 0 && !szuroMufaj.has(film.mufaj)) return false;

        // Formátum + nyelv szűrő
        const formatumok = Object.keys(film.vetitesek || {});
        if (szuroFormatum.size > 0) {
            const vanFormatum = [...szuroFormatum].some(f => formatumok.includes(f));
            if (!vanFormatum) return false;
        }
        if (szuroNyelv.size > 0) {
            const vanNyelv = [...szuroNyelv].some(n => formatumok.includes(n));
            if (!vanNyelv) return false;
        }
        return true;
    });
}

// ── Film lista ────────────────────────────────────────────────
function renderFilmek() {
    const lista = document.getElementById("filmLista");
    lista.innerHTML = "";

    if (FILMEK.length === 0) {
        lista.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem;">Filmek betöltése...</div>`;
        return;
    }

    const megjelenito = szurtFilmek();

    // Eredmény szöveg
    const eredmenyEl = document.getElementById("szuroEredmeny");
    const vanSzuro = szuroMufaj.size > 0 || szuroFormatum.size > 0 || szuroNyelv.size > 0;
    if (eredmenyEl) {
        if (vanSzuro) {
            eredmenyEl.style.display = "block";
            eredmenyEl.innerHTML = `<span>${megjelenito.length}</span> film felel meg a szűrőknek`;
        } else {
            eredmenyEl.style.display = "none";
        }
    }

    if (megjelenito.length === 0) {
        lista.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:2rem;">Nincs a szűrőknek megfelelő film.</div>`;
        return;
    }

    megjelenito.forEach(film => {
        const sor = document.createElement("div");
        sor.className = "film-sor";

        const plakat = document.createElement("div");
        plakat.className = "film-plakat";
        if (film.kep_url) {
            const img = document.createElement("img");
            img.src = film.kep_url; img.alt = film.cim;
            img.onerror = () => { plakat.innerHTML = `<div class="film-plakat-placeholder">🎬</div>`; };
            plakat.appendChild(img);
        } else {
            plakat.innerHTML = `<div class="film-plakat-placeholder">🎬</div>`;
        }
        sor.appendChild(plakat);

        // Szűrt vetítések – ha van aktív szűrő, csak a megfelelő formátumok jelennek meg
        let vetitesekMegjelenito = film.vetitesek || {};
        if (szuroFormatum.size > 0 || szuroNyelv.size > 0) {
            const aktiv = new Set([...szuroFormatum, ...szuroNyelv]);
            vetitesekMegjelenito = {};
            Object.entries(film.vetitesek || {}).forEach(([fmt, idok]) => {
                if (aktiv.size === 0 || aktiv.has(fmt)) vetitesekMegjelenito[fmt] = idok;
            });
        }

        const tagsHtml = Object.keys(film.vetitesek || {}).map(f =>
            `<span class="film-tag${f === "IMAX" ? " imax" : f === "4DX" ? " x4d" : ""}">${f}</span>`
        ).join("");

        const vetitesekHtml = Object.entries(vetitesekMegjelenito).map(([fmt, idok]) => `
            <div class="vetites-blokk">
                <div class="vetites-formatum">${fmt}</div>
                <div class="idopont-gombok">
                    ${idok.map(t =>
                        `<button onclick="nyissModal(${film.id},'${t}','${fmt}','${film.cim}')"
                            class="idopont-gomb${fmt === "IMAX" ? " imax-gomb" : ""}">${t}</button>`
                    ).join("")}
                </div>
            </div>`).join("");

        const ido = film.idotartam ? `${Math.floor(film.idotartam/60)}ó ${film.idotartam%60}p` : "";

        const info = document.createElement("div");
        info.className = "film-info";
        info.innerHTML = `
            <div class="film-fejlec">
                <div>
                <div class="film-cim" onclick="nyissFilmInfo(${film.id})" style="cursor:pointer;" title="Kattints a részletekért">${film.cim} <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400;">ℹ️</span></div>                    <div class="film-meta-sor">
                        <span>${film.mufaj}</span><span class="dot"></span>
                        <span>${ido}</span><span class="dot"></span>
                        <span style="display:flex;gap:0.3rem;flex-wrap:wrap;">${tagsHtml}</span>
                    </div>
                </div>
                <span class="kor-badge">${film.korcsoport}</span>
            </div>
            <div class="vetites-blokkok">${vetitesekHtml}</div>`;
        sor.appendChild(info);
        lista.appendChild(sor);
    });
}

// ── Hero poster foglalás ──────────────────────────────────────
function heroPosterFoglalas() {
    if (FILMEK.length === 0) return;
    const elsoFilm = FILMEK[0];
    const elsoFormatum = Object.keys(elsoFilm.vetitesek)[0];
    const elsoIdopont  = elsoFilm.vetitesek[elsoFormatum][0];
    nyissModal(elsoFilm.id, elsoIdopont, elsoFormatum, elsoFilm.cim);
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
    const isKedd  = isKivalasztottNapKedd();
    const alapAr  = ALAP_ARAK[formatum] || 3500;
    const user    = typeof getUser === "function" ? getUser() : null;
    const isAdmin = user && user.szerep === "admin";

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
                            return `<span style="padding:0.15rem 0.5rem;border-radius:999px;border:1px solid ${el?"rgba(255,255,255,0.1)":"rgba(247,147,30,0.3)"};background:${el?"rgba(255,255,255,0.03)":"rgba(247,147,30,0.08)"};color:${el?"rgba(255,255,255,0.3)":"#ffb347"};cursor:${el?"default":"pointer"};${el?"text-decoration:line-through;":""}"
                                ${!el?`onclick="document.getElementById('modalKuponInput').value='${kod}'"`:""}>
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
                                szek.style.cssText = ""; szek.title = azon;
                                sajatSzekek = sajatSzekek.filter(x => x.szek !== azon);
                                sajatSzekAzonositok.delete(azon);
                                szek.addEventListener("click", () => {
                                    if (!modalKivalasztott.has(azon) && modalKivalasztott.size + sajatSzekek.length >= 8) { alert("Maximum 8 helyet foglalhatsz!"); return; }
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
                                const foglRes = await fetch(`${API}/admin/foglalasok`, { headers: { "Authorization": "Bearer " + localStorage.getItem("mozi_token") } });
                                if (!foglRes.ok) { alert("Nem sikerült lekérni."); return; }
                                const osszes = await foglRes.json();
                                const talalat = osszes.find(f => String(f.film_id) === String(filmId) && f.idopont === teljesIdopont && f.formatum === formatum && f.allapot === "aktiv" && f.szekek.includes(azon));
                                if (!talalat) { alert("Nem található a foglalás."); return; }
                                const r = await fetch(`${API}/foglalasok/admin/${talalat.id}`, { method: "DELETE", headers: { "Authorization": "Bearer " + localStorage.getItem("mozi_token") } });
                                if (r.ok) { szek.classList.remove("foglalt"); szek.style.cursor = ""; szek.title = azon; foglaltSzekek.delete(azon); }
                                else { const d = await r.json(); alert(d.error || "Hiba."); }
                            } catch { alert("Szerverhiba."); }
                        });
                    });
                }
            } else {
                szek.addEventListener("click", () => {
                    if (!modalKivalasztott.has(azon) && modalKivalasztott.size + sajatSzekek.length >= 8) { alert("Maximum 8 helyet foglalhatsz!"); return; }
                    if (modalKivalasztott.has(azon)) { modalKivalasztott.delete(azon); szek.classList.remove("kivalasztott"); }
                    else { modalKivalasztott.add(azon); szek.classList.add("kivalasztott"); }
                    frissitModalOsszesito(alapAr, isKedd);
                });
            }
            sor.appendChild(szek);
        }
        map.appendChild(sor);
    }

    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    document.getElementById("modalBezar").addEventListener("click", () => modal.remove());
    document.getElementById("modalVissza")?.addEventListener("click", () => modal.remove());
    document.getElementById("modalLoginLink")?.addEventListener("click", () => { modal.remove(); document.querySelector(".nav-btn.secondary")?.click(); });

    document.getElementById("modalKuponBtn")?.addEventListener("click", () => {
        const kod = document.getElementById("modalKuponInput").value.trim().toUpperCase();
        const uzenet = document.getElementById("modalKuponUzenet");
        if (!KUPONOK[kod]) { uzenet.textContent = "Érvénytelen kuponkód."; uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return; }
        if (KUPONOK[kod].csakKedd && !isKedd) { uzenet.textContent = "Ez a kupon csak kedden érvényes!"; uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return; }
        if (modalKuponok.has(kod)) { uzenet.textContent = "Ezt a kupont már hozzáadtad."; uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return; }
        // DATE és ROMANTIKUS csak 2 székre érvényes
        if ((kod === "DATE" || kod === "ROMANTIKUS") && modalKivalasztott.size !== 2) {
            uzenet.textContent = "Ez a kupon csak pontosan 2 szék foglalásakor érvényes!";
            uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return;
        }       
        if (user && KUPONOK[kod].limit !== null) {
            const n = parseInt(localStorage.getItem(`kupon_hasznalt_${user.id}_${kod}`) || "0");
            if (n >= KUPONOK[kod].limit) { uzenet.textContent = `Kupont már felhasználtad (${n}/${KUPONOK[kod].limit}).`; uzenet.className = "kupon-uzenet err"; uzenet.style.display = "block"; return; }
        }
        modalKuponok.add(kod);
        document.getElementById("modalKuponInput").value = "";
        uzenet.textContent = `✓ ${KUPONOK[kod].nev} hozzáadva!`; uzenet.className = "kupon-uzenet ok"; uzenet.style.display = "block";
        const aktivEl = document.getElementById("aktivKuponok");
if (aktivEl) { aktivEl.style.display = "block"; aktivEl.textContent = "Aktív kuponok: " + [...modalKuponok].map(k => KUPONOK[k].nev).join(", "); }

// Chip frissítése – hozzáadott kupon áthúzva
const chipek = document.querySelectorAll(`[onclick*="'${kod}'"]`);
chipek.forEach(chip => {
    chip.style.textDecoration = "line-through";
    chip.style.opacity = "0.4";
    chip.style.cursor = "default";
    chip.onclick = null;
});

frissitModalOsszesito(alapAr, isKedd);
    });

    document.getElementById("modalFoglalasBtn")?.addEventListener("click", async () => {
        const u = typeof getUser === "function" ? getUser() : null;
        if (!u || modalKivalasztott.size === 0) return;
        const btn = document.getElementById("modalFoglalasBtn");
        btn.disabled = true; btn.textContent = "Feldolgozás…";
        try {
            const res = await fetch(`${API}/foglalasok`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("mozi_token") },
                body: JSON.stringify({ vetites_id: filmId, szekek: [...modalKivalasztott], film_id: filmId, idopont: teljesIdopont, formatum }),
            });
            if (res.ok) {
                modalKuponok.forEach(kod => {
                    // DATE és ROMANTIKUS csak 2 székre számít fel
                    if ((kod === "DATE" || kod === "ROMANTIKUS") && modalKivalasztott.size !== 2) return;
                    const key = `kupon_hasznalt_${u.id}_${kod}`;
                    localStorage.setItem(key, String(parseInt(localStorage.getItem(key) || "0") + 1));
                });            
                // Ár kiszámítása
                const isKeddSiker = isKivalasztottNapKedd();
                let egysegSiker = ALAP_ARAK[formatum] || 3500;
                if (isKeddSiker && modalKuponok.size === 0) egysegSiker = Math.round(egysegSiker * 0.8);
                modalKuponok.forEach(kod => {
                    const k = KUPONOK[kod];
                    if (k.tipus === "fix") egysegSiker = Math.min(egysegSiker, k.ertek);
                    else egysegSiker = Math.round(egysegSiker * (1 - k.ertek / 100));
                });
                if (modalKivalasztott.size >= 4 && modalKuponok.size === 0 && !isKeddSiker) egysegSiker = Math.round(egysegSiker * 0.85);
                const osszegSiker = egysegSiker * modalKivalasztott.size;
                const ft = n => n.toLocaleString("hu-HU") + " Ft";
            
                // Siker doboz frissítése
                document.getElementById("modalSiker").innerHTML = `
                    <div class="siker-ikon">🎉</div>
                    <div class="siker-cim">Foglalás sikeres!</div>
                    <div class="siker-szov">Jegyeid le lettek foglalva.<br>A pénztárnál add meg a neved vagy e-mail címed.</div>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0.85rem 1rem;margin:1rem 0;text-align:left;font-size:0.84rem;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
                            <span style="color:var(--text-muted);">Lefoglalt székek:</span>
                            <span style="color:#fff;font-weight:600;">${[...modalKivalasztott].sort().join(", ")}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
                            <span style="color:var(--text-muted);">Jegyek száma:</span>
                            <span style="color:#fff;">${modalKivalasztott.size} db</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.07);padding-top:0.4rem;margin-top:0.4rem;">
                            <span style="color:var(--text-muted);">Végösszeg:</span>
                            <span style="color:#ffcc00;font-weight:700;font-size:1rem;">${ft(osszegSiker)}</span>
                        </div>
                    </div>
                    <button class="vissza-btn" id="modalVissza">Bezárás</button>
                `;
            
                document.getElementById("modalTartalom").style.display = "none";
                document.getElementById("modalSiker").style.display = "block";
                document.getElementById("modalVissza").addEventListener("click", () => modal.remove());
            } else { const d = await res.json(); alert(d.error || "Hiba."); btn.disabled = false; btn.textContent = "Jegyek foglalása"; }
        } catch { alert("Szerverhiba."); btn.disabled = false; btn.textContent = "Jegyek foglalása"; }
    });

    frissitModalOsszesito(alapAr, isKedd);
}

// ── Összesítő ─────────────────────────────────────────────────
function frissitModalOsszesito(alapAr, isKedd) {
    const sorok  = document.getElementById("modalOsszesitoSorok");
    const btn    = document.getElementById("modalFoglalasBtn");
    const loginW = document.getElementById("modalLoginWarn");
    const darab  = modalKivalasztott.size;

    if (darab === 0) { sorok.innerHTML = `<div class="osszesito-sor"><span>Nincs kiválasztott szék</span><span>–</span></div>`; if (btn) btn.disabled = true; return; }

    let egyseg = alapAr; let kedvNevek = [];
    if (isKedd && modalKuponok.size === 0) { egyseg = Math.round(egyseg * 0.8); kedvNevek.push("Keddi -20%"); }
    modalKuponok.forEach(kod => {
        // DATE és ROMANTIKUS csak 2 székre érvényes
        if ((kod === "DATE" || kod === "ROMANTIKUS") && darab !== 2) {
            kedvNevek.push(`${KUPONOK[kod].nev} ⚠️ (csak 2 székre érvényes)`);
            return;
        }
        const k = KUPONOK[kod];
        if (k.tipus === "fix") { egyseg = Math.min(egyseg, k.ertek); } else { egyseg = Math.round(egyseg * (1 - k.ertek / 100)); }
        kedvNevek.push(k.nev);
    });
    if (darab >= 4 && modalKuponok.size === 0 && !isKedd) { egyseg = Math.round(egyseg * 0.85); kedvNevek.push("Családi -15%"); }

    const osszeg = egyseg * darab;
    const ft = n => n.toLocaleString("hu-HU") + " Ft";
    const szekLista = [...modalKivalasztott].sort().join(", ");

    let html = `<div class="osszesito-sor"><span>Kiválasztott székek</span><span style="color:#fff;">${szekLista}</span></div><div class="osszesito-sor"><span>Alapár / jegy</span><span>${ft(alapAr)}</span></div>`;
    if (kedvNevek.length > 0) html += `<div class="osszesito-sor" style="color:#4caf50;"><span>Kedvezmény <span class="kedv-badge">${kedvNevek.join(" + ")}</span></span><span>${ft(egyseg)}/jegy</span></div>`;
    html += `<div class="osszesito-sor"><span>${darab} db × ${ft(egyseg)}</span><span></span></div><div class="osszesito-sor total"><span>Összesen</span><span>${ft(osszeg)}</span></div>`;
    sorok.innerHTML = html;

    const u = typeof getUser === "function" ? getUser() : null;
    if (!u) { if (loginW) loginW.style.display = "block"; if (btn) btn.disabled = true; }
    else    { if (loginW) loginW.style.display = "none";  if (btn) btn.disabled = false; }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", betoltAdatok);