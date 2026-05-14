// auth.js – frontend bejelentkezés/regisztráció
const API = "http://localhost:3000";

// ── Token / User kezelés ──────────────────────────────────────
function getToken() {
  return localStorage.getItem("mozi_token");
}
function getUser() {
  const u = localStorage.getItem("mozi_user");
  return u ? JSON.parse(u) : null;
}
function saveAuth(token, user) {
  localStorage.setItem("mozi_token", token);
  localStorage.setItem("mozi_user", JSON.stringify(user));
}
function logout() {
  localStorage.removeItem("mozi_token");
  localStorage.removeItem("mozi_user");
  updateNavbar();
}

// ── Navbar frissítése bejelentkezés után ─────────────────────
function updateNavbar() {
  const user = getUser();
  const actions = document.querySelector(".nav-actions");
  if (!actions) return;

  if (user) {
    actions.innerHTML = `
      <span style="font-size:0.8rem;color:#ffb347;">👤 ${user.nev}</span>
      <button class="nav-btn secondary" onclick="logout()">Kijelentkezés</button>
    `;
  } else {
    actions.innerHTML = `
      <button class="nav-btn secondary" id="openLogin">Bejelentkezés</button>
      <button class="nav-btn primary" id="openReg">Regisztráció</button>
    `;
    document.getElementById("openLogin").addEventListener("click", () => openModal("login"));
    document.getElementById("openReg").addEventListener("click", () => openModal("reg"));
  }
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(mode) {
  document.getElementById("authModal")?.remove();

  const isLogin = mode === "login";
  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.style.cssText = `
    position:fixed;inset:0;z-index:999;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="
      background:#0f1628;border:1px solid rgba(255,255,255,0.1);
      border-radius:16px;padding:2rem;width:100%;max-width:380px;
      box-shadow:0 0 40px rgba(0,0,0,0.8);
    ">
      <h2 style="margin-bottom:1.25rem;font-size:1.1rem;color:#fff;">
        ${isLogin ? "🔑 Bejelentkezés" : "📝 Regisztráció"}
      </h2>

      ${!isLogin ? `
        <input id="authNev" type="text" placeholder="Teljes név"
          style="width:100%;padding:0.65rem 0.9rem;margin-bottom:0.75rem;
          border-radius:8px;border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;">
      ` : ""}

      <input id="authEmail" type="email" placeholder="E-mail cím"
        style="width:100%;padding:0.65rem 0.9rem;margin-bottom:0.75rem;
        border-radius:8px;border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;">

      <input id="authJelszo" type="password" placeholder="Jelszó"
        style="width:100%;padding:0.65rem 0.9rem;margin-bottom:1rem;
        border-radius:8px;border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;">

      <div id="authHiba" style="color:#ff6b6b;font-size:0.8rem;margin-bottom:0.75rem;display:none;"></div>

      <button id="authSubmit" style="
        width:100%;padding:0.75rem;border-radius:999px;border:none;
        background:linear-gradient(135deg,#f7931e,#ffb347);
        color:#1b1305;font-weight:700;font-size:0.9rem;cursor:pointer;
      ">${isLogin ? "Bejelentkezés" : "Regisztráció"}</button>

      <p style="text-align:center;margin-top:1rem;font-size:0.8rem;color:#b3b3b3;">
        ${isLogin
          ? `Nincs még fiókod? <a href="#" id="switchMode" style="color:#f7931e;">Regisztrálj!</a>`
          : `Már van fiókod? <a href="#" id="switchMode" style="color:#f7931e;">Jelentkezz be!</a>`
        }
      </p>
      <p style="text-align:center;margin-top:0.5rem;">
        <a href="#" id="closeModal" style="font-size:0.75rem;color:#555;">Bezárás</a>
      </p>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  document.getElementById("closeModal").addEventListener("click", (e) => {
    e.preventDefault();
    modal.remove();
  });

  document.getElementById("switchMode").addEventListener("click", (e) => {
    e.preventDefault();
    openModal(isLogin ? "reg" : "login");
  });

  document.getElementById("authSubmit").addEventListener("click", async () => {
    const email  = document.getElementById("authEmail").value.trim();
    const jelszo = document.getElementById("authJelszo").value;
    const hiba   = document.getElementById("authHiba");
    const btn    = document.getElementById("authSubmit");

    if (!email || !jelszo) {
      hiba.textContent = "Töltsd ki az összes mezőt!";
      hiba.style.display = "block";
      return;
    }

    btn.disabled = true;
    btn.textContent = "...";

    try {
      let url, body;
      if (isLogin) {
        url  = `${API}/auth/bejelentkezes`;
        body = { email, jelszo };
      } else {
        const nev = document.getElementById("authNev").value.trim();
        if (!nev) {
          hiba.textContent = "Add meg a neved!";
          hiba.style.display = "block";
          btn.disabled = false;
          btn.textContent = "Regisztráció";
          return;
        }
        url  = `${API}/auth/regisztracio`;
        body = { nev, email, jelszo };
      }

      const res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        hiba.textContent = data.error || "Hiba történt.";
        hiba.style.display = "block";
        btn.disabled = false;
        btn.textContent = isLogin ? "Bejelentkezés" : "Regisztráció";
        return;
      }

      saveAuth(data.token, data.felhasznalo);
      modal.remove();
      updateNavbar();

    } catch {
      hiba.textContent = "Nem sikerült elérni a szervert.";
      hiba.style.display = "block";
      btn.disabled = false;
      btn.textContent = isLogin ? "Bejelentkezés" : "Regisztráció";
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();
});