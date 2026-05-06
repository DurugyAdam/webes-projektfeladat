// ============================================================
//  auth.js – Mozifoglaló auth | dropdown panel verzió
// ============================================================

const API = "http://localhost:3000";

// ── Token / user kezelés ──────────────────────────────────────
function getToken() { return localStorage.getItem("mozi_token"); }
function getUser()  { const u = localStorage.getItem("mozi_user"); return u ? JSON.parse(u) : null; }
function setAuth(token, user) {
    localStorage.setItem("mozi_token", token);
    localStorage.setItem("mozi_user", JSON.stringify(user));
}
function clearAuth() {
    localStorage.removeItem("mozi_token");
    localStorage.removeItem("mozi_user");
}

// ── Stílusok injektálása ──────────────────────────────────────
function injectStyles() {
    if (document.getElementById("authStyles")) return;
    const style = document.createElement("style");
    style.id = "authStyles";
    style.textContent = `
        .nav-actions { position: relative; }

        .nav-user-btn {
            display: flex; align-items: center; gap: 0.5rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 999px;
            padding: 0.35rem 0.9rem 0.35rem 0.4rem;
            cursor: pointer; color: #fff;
            transition: background 0.15s, border-color 0.15s;
        }
        .nav-user-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(247,147,30,0.4);
        }
        .nav-avatar {
            width: 26px; height: 26px; border-radius: 50%;
            background: linear-gradient(135deg, #f7931e, #ffb347);
            color: #1b1305; font-weight: 800; font-size: 0.78rem;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 10px rgba(247,147,30,0.5);
            flex-shrink: 0;
        }
        .nav-username {
            font-size: 0.82rem; font-weight: 500; letter-spacing: 0.02em;
        }
        .nav-chevron {
            font-size: 0.6rem; color: #888; margin-left: 0.1rem;
            transition: transform 0.2s ease;
        }
        .nav-user-btn.open .nav-chevron { transform: rotate(180deg); }

        /* ── Dropdown panel ── */
        .auth-dropdown {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            width: 280px;
            background: #0e1525;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 16px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 30px rgba(247,147,30,0.07);
            overflow: hidden;
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
            transform-origin: top right;
            pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease;
            z-index: 9999;
        }
        .auth-dropdown.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        .dd-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .dd-tab {
            flex: 1; padding: 0.75rem 0;
            background: transparent; border: none;
            color: #666; font-size: 0.78rem; font-weight: 600;
            letter-spacing: 0.06em; text-transform: uppercase;
            cursor: pointer; transition: color 0.15s;
            font-family: inherit;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
        }
        .dd-tab.active { color: #f7931e; border-bottom-color: #f7931e; }
        .dd-tab:hover:not(.active) { color: #bbb; }

        .dd-body { padding: 1.1rem 1.2rem 1.2rem; }

        .dd-form { display: flex; flex-direction: column; gap: 0.6rem; }
        .dd-form.hidden { display: none; }

        .dd-field { display: flex; flex-direction: column; gap: 0.25rem; }
        .dd-label {
            font-size: 0.7rem; color: #777;
            letter-spacing: 0.07em; text-transform: uppercase;
        }
        .dd-input {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 9px;
            color: #fff; padding: 0.55rem 0.8rem;
            font-size: 0.88rem; font-family: inherit;
            outline: none; transition: border-color 0.15s, background 0.15s;
            width: 100%; box-sizing: border-box;
        }
        .dd-input::placeholder { color: #444; }
        .dd-input:focus {
            border-color: #f7931e;
            background: rgba(247,147,30,0.05);
        }

        .dd-submit {
            margin-top: 0.4rem;
            background: linear-gradient(135deg, #f7931e, #ffb347);
            border: none; border-radius: 999px;
            color: #1b1305; padding: 0.6rem;
            font-size: 0.82rem; font-weight: 700;
            letter-spacing: 0.08em; text-transform: uppercase;
            cursor: pointer; font-family: inherit;
            box-shadow: 0 0 18px rgba(247,147,30,0.35);
            transition: filter 0.15s, box-shadow 0.15s;
        }
        .dd-submit:hover { filter: brightness(1.08); box-shadow: 0 0 24px rgba(247,147,30,0.5); }
        .dd-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .dd-msg {
            font-size: 0.76rem; border-radius: 7px;
            padding: 0; max-height: 0; overflow: hidden;
            transition: max-height 0.2s, padding 0.2s, margin 0.2s;
            margin: 0;
        }
        .dd-msg.error   { background: rgba(220,50,50,0.13); color: #ff7070;
                          border: 1px solid rgba(220,50,50,0.22); }
        .dd-msg.success { background: rgba(50,200,100,0.1); color: #5cdb8f;
                          border: 1px solid rgba(50,200,100,0.18); }
        .dd-msg.show    { max-height: 50px; padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; }

        /* ── Bejelentkezett dropdown ── */
        .dd-user-panel { padding: 1.1rem 1.2rem; }
        .dd-user-info {
            display: flex; align-items: center; gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .dd-avatar-lg {
            width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg, #f7931e, #ffb347);
            color: #1b1305; font-weight: 800; font-size: 1rem;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 14px rgba(247,147,30,0.45);
        }
        .dd-user-name  { font-size: 0.92rem; font-weight: 600; color: #fff; }
        .dd-user-email { font-size: 0.73rem; color: #666; margin-top: 0.1rem; }
        .dd-divider { height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 0.9rem; }
        .dd-logout {
            width: 100%; background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 9px; color: #999;
            padding: 0.5rem; font-size: 0.8rem;
            cursor: pointer; font-family: inherit;
            transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .dd-logout:hover {
            background: rgba(220,50,50,0.1);
            border-color: rgba(220,50,50,0.3);
            color: #ff7070;
        }
    `;
    document.head.appendChild(style);
}

// ── Dropdown HTML ─────────────────────────────────────────────
function buildDropdown() {
    const dd = document.createElement("div");
    dd.className = "auth-dropdown";
    dd.id = "authDropdown";
    dd.innerHTML = `
        <div class="dd-tabs">
            <button class="dd-tab active" data-tab="login">Bejelentkezés</button>
            <button class="dd-tab" data-tab="register">Regisztráció</button>
        </div>
        <div class="dd-body">
            <div class="dd-msg" id="ddMsg"></div>

            <form class="dd-form" id="ddLoginForm">
                <div class="dd-field">
                    <label class="dd-label">Email</label>
                    <input class="dd-input" type="email" id="ddLoginEmail" placeholder="pelda@email.hu" autocomplete="email" required>
                </div>
                <div class="dd-field">
                    <label class="dd-label">Jelszó</label>
                    <input class="dd-input" type="password" id="ddLoginPass" placeholder="••••••••" autocomplete="current-password" required>
                </div>
                <button class="dd-submit" type="submit">Belépés</button>
            </form>

            <form class="dd-form hidden" id="ddRegisterForm">
                <div class="dd-field">
                    <label class="dd-label">Teljes név</label>
                    <input class="dd-input" type="text" id="ddRegNev" placeholder="Kovács Péter" autocomplete="name" required>
                </div>
                <div class="dd-field">
                    <label class="dd-label">Email</label>
                    <input class="dd-input" type="email" id="ddRegEmail" placeholder="pelda@email.hu" autocomplete="email" required>
                </div>
                <div class="dd-field">
                    <label class="dd-label">Jelszó <span style="color:#555;font-size:0.68rem;text-transform:none">(min. 6 karakter)</span></label>
                    <input class="dd-input" type="password" id="ddRegPass" placeholder="••••••••" autocomplete="new-password" required minlength="6">
                </div>
                <button class="dd-submit" type="submit">Regisztráció</button>
            </form>
        </div>
    `;
    return dd;
}

function buildUserDropdown(user) {
    const dd = document.createElement("div");
    dd.className = "auth-dropdown";
    dd.id = "authDropdown";
    dd.innerHTML = `
        <div class="dd-user-panel">
            <div class="dd-user-info">
                <div class="dd-avatar-lg">${user.nev.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="dd-user-name">${user.nev}</div>
                    <div class="dd-user-email">${user.email}</div>
                </div>
            </div>
            <div class="dd-divider"></div>
            <button class="dd-logout" id="ddLogout">Kijelentkezés</button>
        </div>
    `;
    return dd;
}

// ── Navbar felépítése ─────────────────────────────────────────
function updateNavbar() {
    const actions = document.querySelector(".nav-actions");
    if (!actions) return;

    const user = getUser();
    actions.innerHTML = "";

    if (user) {
        const btn = document.createElement("button");
        btn.className = "nav-user-btn";
        btn.id = "navUserBtn";
        btn.innerHTML = `
            <div class="nav-avatar">${user.nev.charAt(0).toUpperCase()}</div>
            <span class="nav-username">${user.nev}</span>
            <span class="nav-chevron">▼</span>
        `;
        actions.appendChild(btn);
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleDropdown(true, user);
        });
    } else {
        const loginBtn = document.createElement("button");
        loginBtn.className = "nav-btn secondary";
        loginBtn.textContent = "Bejelentkezés";

        const regBtn = document.createElement("button");
        regBtn.className = "nav-btn primary";
        regBtn.textContent = "Regisztráció";

        actions.appendChild(loginBtn);
        actions.appendChild(regBtn);

        loginBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openDropdown(false, null, "login");
        });
        regBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openDropdown(false, null, "register");
        });
    }
}

// ── Dropdown nyitás/zárás ─────────────────────────────────────
let dropdownOpen = false;

function openDropdown(isUser, user = null, tab = "login") {
    const actions = document.querySelector(".nav-actions");
    let dd = document.getElementById("authDropdown");
    if (dd) dd.remove();

    const newDd = isUser ? buildUserDropdown(user) : buildDropdown();
    actions.appendChild(newDd);

    if (!isUser) {
        switchTab(tab);
        wireLoginForm();
        wireRegisterForm();
        document.querySelectorAll(".dd-tab").forEach(t =>
            t.addEventListener("click", () => switchTab(t.dataset.tab))
        );
    } else {
        document.getElementById("ddLogout").addEventListener("click", () => {
            clearAuth();
            closeDropdown();
            updateNavbar();
        });
    }

    const btn = document.getElementById("navUserBtn");
    if (btn) btn.classList.add("open");

    requestAnimationFrame(() => requestAnimationFrame(() =>
        newDd.classList.add("open")
    ));
    dropdownOpen = true;
}

function toggleDropdown(isUser, user = null, tab = "login") {
    if (dropdownOpen) { closeDropdown(); return; }
    openDropdown(isUser, user, tab);
}

function closeDropdown() {
    const dd = document.getElementById("authDropdown");
    const btn = document.getElementById("navUserBtn");
    if (btn) btn.classList.remove("open");
    if (dd) {
        dd.classList.remove("open");
        setTimeout(() => dd.remove(), 200);
    }
    dropdownOpen = false;
}

document.addEventListener("click", (e) => {
    const actions = document.querySelector(".nav-actions");
    if (dropdownOpen && actions && !actions.contains(e.target)) closeDropdown();
});

// ── Tab váltás ────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll(".dd-tab").forEach(t =>
        t.classList.toggle("active", t.dataset.tab === tab)
    );
    const lf = document.getElementById("ddLoginForm");
    const rf = document.getElementById("ddRegisterForm");
    if (lf) lf.classList.toggle("hidden", tab !== "login");
    if (rf) rf.classList.toggle("hidden", tab !== "register");
    hideMsg();
}

// ── Üzenetek ─────────────────────────────────────────────────
function showMsg(text, type) {
    const el = document.getElementById("ddMsg");
    if (!el) return;
    el.className = `dd-msg ${type} show`;
    el.textContent = text;
}
function hideMsg() {
    const el = document.getElementById("ddMsg");
    if (el) el.className = "dd-msg";
}

// ── Login ─────────────────────────────────────────────────────
function wireLoginForm() {
    const form = document.getElementById("ddLoginForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector(".dd-submit");
        btn.disabled = true; btn.textContent = "Belépés…";
        hideMsg();
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email:  document.getElementById("ddLoginEmail").value.trim(),
                    jelszo: document.getElementById("ddLoginPass").value,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                showMsg(data.error || "Hiba történt", "error");
                btn.disabled = false; btn.textContent = "Belépés";
            } else {
                setAuth(data.token, data.user);
                showMsg(`Szia, ${data.user.nev}! 👋`, "success");
                setTimeout(() => { closeDropdown(); updateNavbar(); }, 800);
            }
        } catch {
            showMsg("Nem sikerült elérni a szervert", "error");
            btn.disabled = false; btn.textContent = "Belépés";
        }
    });
}

// ── Register ──────────────────────────────────────────────────
function wireRegisterForm() {
    const form = document.getElementById("ddRegisterForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector(".dd-submit");
        btn.disabled = true; btn.textContent = "Regisztráció…";
        hideMsg();
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nev:    document.getElementById("ddRegNev").value.trim(),
                    email:  document.getElementById("ddRegEmail").value.trim(),
                    jelszo: document.getElementById("ddRegPass").value,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                showMsg(data.error || "Hiba történt", "error");
                btn.disabled = false; btn.textContent = "Regisztráció";
            } else {
                setAuth(data.token, data.user);
                showMsg(`Üdv, ${data.user.nev}! 🎉`, "success");
                setTimeout(() => { closeDropdown(); updateNavbar(); }, 900);
            }
        } catch {
            showMsg("Nem sikerült elérni a szervert", "error");
            btn.disabled = false; btn.textContent = "Regisztráció";
        }
    });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    updateNavbar();
});