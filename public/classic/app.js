/* DracinPlay frontend — vanilla JS SPA, talks to zero-dep server.js API */
/* Sub-path safe: derive our mount base from our own <script> URL,
   e.g. /dracin/app.js → /dracin, /app.js → "". Empty = serve at root. */
const BASE = (() => {
  try {
    const el = document.querySelector('script[src*="app.js"]');
    if (!el) return "";
    return new URL(el.getAttribute("src"), location.href).pathname.replace(/\/app\.js$/, "");
  } catch { return ""; }
})();
const withBase = (p) => BASE + p;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const S = {
  platforms: [],
  platform: "",          // "" = beranda
  items: [],
  limit: 24,
  isSearch: false,
  query: "",
  loading: false,
  detail: null,          // watch object
  dramaMeta: null,
  curEp: 1,
  hls: null,
  fav: new Set(JSON.parse(localStorage.getItem("wd_fav") || "[]")),
  cont: JSON.parse(localStorage.getItem("wd_cont") || "{}"), // slug -> {ep,title,cover,ts}
};

function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add("hidden"), ms);
}

async function api(path) {
  const r = await fetch(withBase(path));
  if (!r.ok) {
    let e = {};
    try { e = await r.json(); } catch {}
    throw new Error(e.error || ("HTTP " + r.status));
  }
  return r.json();
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Prefer `cover` (webdracin /api/cover → jpeg/webp, renderable) over
// `cover_real` (often raw .heic → blank in browsers). All covers go through
// our /api/img disk cache so repeat loads are instant.
const rawCover = (d) => d.cover || d.cover_real || "";
const imgProxy = (u) => (u ? withBase("/api/img?url=" + encodeURIComponent(u)) : "");
const coverOf = (d) => imgProxy(rawCover(d)) || "";
// <img onerror> fallback chain: proxy → direct → cover_real → placeholder
window.imgErr = function (el) {
  const step = +(el.dataset.step || 0);
  el.dataset.step = step + 1;
  if (step === 0 && el.dataset.direct) { el.src = el.dataset.direct; }
  else if (step <= 1 && el.dataset.real) { el.src = el.dataset.real; }
  else { el.onerror = null; el.src = el.dataset.ph; }
};
function ph(title) {
  const ch = esc((title || "?").trim().charAt(0).toUpperCase());
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2a2a40'/><stop offset='1' stop-color='#e11d48'/></linearGradient></defs><rect width='300' height='400' fill='url(#g)'/><text x='150' y='215' font-size='110' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>${ch}</text></svg>`)}`;
}

/* ---------- favorites & continue ---------- */
function saveFav() {
  localStorage.setItem("wd_fav", JSON.stringify([...S.fav]));
  $("#favCount").textContent = S.fav.size;
}
function saveCont() {
  try { localStorage.setItem("wd_cont", JSON.stringify(S.cont)); } catch {}
}
function toggleFav(slug, btn) {
  if (S.fav.has(slug)) { S.fav.delete(slug); toast("Dihapus dari favorit"); }
  else { S.fav.add(slug); toast("Ditambah ke favorit ♡"); }
  saveFav();
  if (btn) btn.classList.toggle("on", S.fav.has(slug));
  if (location.hash.startsWith("#/favorit")) renderFav();
}

/* ---------- platforms ---------- */
function paintChips() {
  const bar = $("#platformBar");
  const mk = (val, label) =>
    `<button class="chip${S.platform === val ? " on" : ""}" data-p="${esc(val)}">${esc(label)}</button>`;
  bar.innerHTML =
    mk("", "🏠 Beranda") +
    S.platforms.map((p) => mk(p, p)).join("");
  $$(".chip", bar).forEach((c) => c.onclick = () => {
    S.platform = c.dataset.p;
    S.isSearch = false; S.query = "";
    $("#searchInput").value = "";
    $$(".chip", bar).forEach((x) => x.classList.toggle("on", x === c));
    S.limit = 24;
    loadHome(true);
    if (!location.hash.startsWith("#/")) location.hash = "#/";
  });
}

async function loadPlatforms() {
  try {
    S.platforms = await api("/api/platforms");
  } catch { S.platforms = ["dramabox","melolo","reelshort","flextv","shortbox"]; }
  paintChips();
  // background: hide platforms that currently have zero dramas
  api("/api/platform-status").then((st) => {
    const empty = new Set(st.filter((s) => !s.ok).map((s) => s.platform));
    if (!empty.size) return;
    S.platforms = S.platforms.filter((p) => !empty.has(p));
    $$("#platformBar .chip").forEach((c) => {
      if (c.dataset.p && empty.has(c.dataset.p) && c.dataset.p !== S.platform) c.remove();
    });
  }).catch(() => {});
}

/* ---------- home grid ---------- */
function cardHTML(d) {
  const slug = esc(d.slug);
  const title = esc(d.title || d.slug);
  const direct = esc(d.cover || "");
  const real = esc(d.cover_real || "");
  const phUrl = esc(ph(d.title));
  const cov = esc(coverOf(d) || ph(d.title));
  const eps = d.episodes ?? d.episodeCount ?? "";
  const pl = esc(d.platform || "");
  const favOn = S.fav.has(d.slug) ? " on" : "";
  return `<article class="card" data-slug="${slug}">
    <div class="th">
      <img loading="lazy" src="${cov}" data-direct="${direct}" data-real="${real}" data-ph="${phUrl}" alt="${title}" referrerpolicy="no-referrer" onerror="imgErr(this)">
      ${eps ? `<span class="ep">${eps} EP</span>` : ""}
      ${pl ? `<span class="pl">${pl}</span>` : ""}
      <button class="fav${favOn}" data-fav="${slug}" title="Favorit">♡</button>
    </div>
    <div class="t"><h3>${title}</h3><small>${pl ? esc(pl) + " • " : ""}${eps ? eps + " episode" : "drama pendek"}</small></div>
  </article>`;
}

function bindCards(root) {
  $$(".card", root).forEach((c) => c.onclick = (e) => {
    if (e.target.closest("[data-fav]")) return;
    location.hash = "#/d/" + c.dataset.slug;
  });
  $$("[data-fav]", root).forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    toggleFav(b.dataset.fav, b);
  });
}

function skeletons(n = 12) {
  return Array.from({ length: n }, () =>
    `<div class="card"><div class="th shimmer" style="aspect-ratio:3/4"></div><div class="t"><h3 class="shimmer" style="height:14px;border-radius:6px"></h3></div></div>`).join("");
}

async function loadHome(reset = false) {
  if (S.loading) return;
  S.loading = true;
  const grid = $("#grid");
  if (reset) grid.innerHTML = skeletons(12);
  $("#gridEmpty").classList.add("hidden");
  try {
    let data;
    if (S.isSearch) {
      $("#gridTitle").textContent = `Hasil “${S.query}”`;
      data = await api(`/api/search?q=${encodeURIComponent(S.query)}&limit=${S.limit}`);
    } else {
      $("#gridTitle").textContent = S.platform ? `Drama ${S.platform}` : "Populer Hari Ini";
      const qp = S.platform ? `?platform=${encodeURIComponent(S.platform)}&limit=${S.limit}` : `?limit=${S.limit}`;
      data = await api("/api/list" + qp);
    }
    S.items = data;
    $("#gridMeta").textContent = `${data.length} judul`;
    grid.innerHTML = data.map(cardHTML).join("");
    $("#gridEmpty").classList.toggle("hidden", data.length > 0);
    bindCards(grid);
    renderHero(data[0]);
    renderContinue();
  } catch (e) {
    toast("Gagal memuat: " + e.message);
  } finally { S.loading = false; }
}

function renderHero(d) {
  const hero = $("#hero");
  if (!d) { hero.classList.add("hidden"); return; }
  hero.classList.remove("hidden");
  hero.innerHTML = `
    <img class="bg" src="${esc(coverOf(d) || ph(d.title))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">
    <div class="in">
      <img class="poster" src="${esc(coverOf(d) || ph(d.title))}" data-direct="${esc(d.cover || "")}" data-real="${esc(d.cover_real || "")}" data-ph="${esc(ph(d.title))}" alt="${esc(d.title)}" referrerpolicy="no-referrer" onerror="imgErr(this)">
      <div>
        <div class="badges"><span class="badge hot">🔥 Unggulan</span>
          ${d.platform ? `<span class="badge">${esc(d.platform)}</span>` : ""}
          ${d.episodes ? `<span class="badge">${d.episodes} Episode</span>` : ""}
          <span class="badge">Sub Indo</span></div>
        <h1>${esc(d.title)}</h1>
        <div class="btnrow">
          <button class="btn" id="heroWatch">▶ Tonton Sekarang</button>
          <button class="btn ghost" id="heroDetail">Lihat Detail</button>
        </div>
      </div>
    </div>`;
  $("#heroWatch").onclick = () => location.hash = "#/w/" + d.slug + "/1";
  $("#heroDetail").onclick = () => location.hash = "#/d/" + d.slug;
}

function renderContinue() {
  const keys = Object.entries(S.cont).sort((a, b) => b[1].ts - a[1].ts).slice(0, 6);
  const row = $("#continueRow");
  if (!keys.length) { row.classList.add("hidden"); return; }
  row.classList.remove("hidden");
  $("#continueGrid").innerHTML = keys.map(([slug, c]) => `
    <article class="card" data-slug="${esc(slug)}">
      <div class="th"><img loading="lazy" src="${esc(c.cover || ph(c.title))}" data-ph="${esc(ph(c.title))}" alt="" referrerpolicy="no-referrer" onerror="imgErr(this)">
      <span class="ep">EP ${c.ep}</span></div>
      <div class="t"><h3>${esc(c.title)}</h3><small>Lanjutkan EP ${c.ep} →</small></div>
    </article>`).join("");
  $$("#continueGrid .card").forEach((el) => el.onclick = () => {
    const c = S.cont[el.dataset.slug];
    location.hash = "#/w/" + el.dataset.slug + "/" + (c?.ep || 1);
  });
}

/* ---------- detail ---------- */
async function openDetail(slug) {
  show("detail");
  const box = $("#detailBox");
  box.innerHTML = `<div class="detail"><div class="shimmer poster" style="aspect-ratio:3/4;border-radius:14px"></div>
    <div><h1>Memuat…</h1><p class="meta">Mengambil sinopsis & daftar episode dari webdracin…</p></div></div>`;
  try {
    const [meta, w] = await Promise.all([
      api(`/api/drama?slug=${encodeURIComponent(slug)}`).catch(() => null),
      api(`/api/watch?slug=${encodeURIComponent(slug)}`),
    ]);
    S.detail = w; S.dramaMeta = meta;
    const cov = coverOf(w) || ph(w.title);
    const isFav = S.fav.has(slug);
    box.innerHTML = `
    <div class="detail">
      <img class="poster" src="${esc(cov)}" data-direct="${esc(w.cover || "")}" data-real="${esc(w.cover_real || "")}" data-ph="${esc(ph(w.title))}" alt="${esc(w.title)}" referrerpolicy="no-referrer" onerror="imgErr(this)">
      <div>
        <div class="badges"><span class="badge hot">${esc(w.platform || "")}</span>
          <span class="badge">${w.episodeCount} Episode</span>
          ${w.playable === false ? `<span class="badge">Metadata saja</span>` : `<span class="badge">Siap diputar</span>`}</div>
        <h1>${esc(w.title)}</h1>
        <div class="meta">${esc(slug)}</div>
        <p class="syn">${esc(w.synopsis || meta?.synopsis || "Sinopsis belum tersedia.")}</p>
        <div class="btnrow">
          <button class="btn" id="dWatch">▶ Tonton EP 1</button>
          <button class="btn ghost" id="dFav">${isFav ? "♥ Favorit" : "♡ Favorit"}</button>
        </div>
        <h3 style="margin:16px 0 4px">Daftar Episode <span class="meta">klik untuk langsung nonton</span></h3>
        <div class="eps">${w.episodes.map((e) =>
          `<button data-ep="${e.number}">EP ${e.number}</button>`).join("")}</div>
      </div>
    </div>`;
    $("#dWatch").onclick = () => location.hash = "#/w/" + slug + "/1";
    $("#dFav").onclick = (e) => { toggleFav(slug, null); e.target.textContent = S.fav.has(slug) ? "♥ Favorit" : "♡ Favorit"; };
    $$(".eps button", box).forEach((b) => b.onclick = () => location.hash = "#/w/" + slug + "/" + b.dataset.ep);
  } catch (e) {
    box.innerHTML = `<div class="empty">Gagal membuka detail: ${esc(e.message)}<br><br><button class="btn small" onclick="location.hash='#/'">Kembali ke Beranda</button></div>`;
  }
}

/* ---------- watch ---------- */
function normSubs(subs) {
  if (!Array.isArray(subs)) return [];
  return subs.map((s, i) => {
    if (typeof s === "string") return { label: s.includes("ind") || s.includes("id") ? "Indonesia" : "Sub " + (i + 1), url: s };
    return { label: s.label || s.lang || s.name || ("Sub " + (i + 1)), url: s.url || s.src || s.file || "" };
  }).filter((s) => s.url);
}

async function openWatch(slug, ep) {
  show("watch");
  ep = Math.max(1, +ep || 1);
  S.curEp = ep;
  const box = $("#watchBox");
  box.innerHTML = `<div class="watch">
    <div><div class="player"><div class="pstatus">Memuat ${esc(slug)} EP ${ep}…</div></div></div>
    <div class="winfo"><h1>Memuat…</h1><p class="meta">Menghubungi scraper…</p></div></div>`;
  try {
    const w = S.detail?.slug === slug ? S.detail : await api(`/api/watch?slug=${encodeURIComponent(slug)}`);
    S.detail = w;
    const eps = w.episodes || [];
    const cur = eps.find((e) => e.number === ep) || eps[0];
    if (!cur) throw new Error("Episode tidak ditemukan");
    S.curEp = cur.number;

    // remember continue
    S.cont[slug] = { ep: cur.number, title: w.title, cover: coverOf(w), ts: Date.now() };
    saveCont(); renderContinue();

    const cov = coverOf(w) || ph(w.title);
    box.innerHTML = `
    <div class="watch">
      <div>
        <div class="player" id="player">
          <video id="vid" controls playsinline preload="metadata" crossorigin="anonymous"
            poster="${esc(cov)}"></video>
          <div class="pstatus hidden" id="pstatus"></div>
        </div>
        <div class="pbar">
          <span class="t">${esc(w.title)} — EP ${cur.number}</span>
          <button class="btn small ghost" id="btnPrev" ${cur.number <= 1 ? "disabled" : ""}>← Prev</button>
          <button class="btn small ghost" id="btnNext" ${cur.number >= w.episodeCount ? "disabled" : ""}>Next →</button>
        </div>
      </div>
      <div class="winfo">
        <div class="badges"><span class="badge hot">${esc(w.platform || "")}</span>
          <span class="badge">EP ${cur.number}/${w.episodeCount}</span>
          <span class="badge" id="subBadge">Sub Indo</span></div>
        <h1>${esc(w.title)}</h1>
        <div class="meta">${esc(slug)} • dramaId ${esc(w.dramaId)}</div>
        <p class="syn">${esc(w.synopsis || "")}</p>
        <div class="wactions">
          <button class="btn small" id="btnFav">${S.fav.has(slug) ? "♥ Favorit" : "♡ Favorit"}</button>
          <button class="btn small ghost" id="btnCopy">⧉ Salin URL Stream</button>
          <a class="btn small ghost" id="btnDl" target="_blank" rel="noopener">⬇ Unduh / VLC</a>
          <button class="btn small ghost" id="btnAuto">▶ Auto-next: ON</button>
        </div>
        <div class="note" id="streamNote">Mengambil URL stream…</div>
        <h3 style="margin:14px 0 4px">Semua Episode</h3>
        <div class="eps">${eps.map((e) =>
          `<button data-ep="${e.number}" class="${e.number === cur.number ? "cur" : ""}">${e.number}</button>`).join("")}</div>
      </div>
    </div>`;

    $$(".eps button", box).forEach((b) => b.onclick = () => location.hash = "#/w/" + slug + "/" + b.dataset.ep);
    $("#btnPrev").onclick = () => { if (cur.number > 1) location.hash = "#/w/" + slug + "/" + (cur.number - 1); };
    $("#btnNext").onclick = () => { if (cur.number < w.episodeCount) location.hash = "#/w/" + slug + "/" + (cur.number + 1); };
    $("#btnFav").onclick = (e) => { toggleFav(slug, null); e.target.textContent = S.fav.has(slug) ? "♥ Favorit" : "♡ Favorit"; };
    let autoNext = true;
    $("#btnAuto").onclick = (e) => { autoNext = !autoNext; e.target.textContent = autoNext ? "▶ Auto-next: ON" : "⏸ Auto-next: OFF"; };

    await loadStream(slug, w, cur, { autoNext: () => autoNext });
  } catch (e) {
    box.innerHTML = `<div class="empty">Gagal memutar: ${esc(e.message)}<br><small>Slug salah / halaman pindah — ambil slug baru dari Beranda.</small>
      <br><br><button class="btn small" onclick="location.hash='#/'">Kembali</button></div>`;
  }
}

let statusTimer = null;
function pstatus(msg, isErr = false) {
  const el = $("#pstatus");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = msg;
  el.style.background = isErr ? "rgba(60,8,16,.85)" : "rgba(0,0,0,.72)";
}

async function loadStream(slug, w, cur, opts = {}) {
  const vid = $("#vid");
  const note = $("#streamNote");
  pstatus(`Memuat stream EP ${cur.number}…<br><small>Menghubungi /api/episode…</small>`);
  try {
    const data = await api(`/api/episode?id=${encodeURIComponent(w.dramaId)}&ep=${cur.number}&eid=${encodeURIComponent(cur.id)}`);
    const url = data.videoUrl;
    const subs = normSubs(data.subtitles);
    if (!url) {
      pstatus(`⚠ <b>Server null</b> untuk EP ${cur.number}.<br><small>Upstream ${esc(w.platform)} kosong — metadata & subtitle tetap ada di 5+ platform null.<br>Coba episode lain atau platform lain.</small>`, true);
      if (note) { note.classList.add("err"); note.textContent = "videoUrl: null dari server. Coba EP lain / platform lain (17 platform berstatus Yes)."; }
      const dl = $("#btnDl"); if (dl) dl.style.display = "none";
      return;
    }
    // wire buttons
    const cp = $("#btnCopy");
    if (cp) cp.onclick = async () => {
      try { await navigator.clipboard.writeText(url); toast("URL stream disalin — tempel di mpv/VLC"); }
      catch { prompt("Salin URL stream:", url); }
    };
    const dl = $("#btnDl");
    if (dl) dl.href = url;

    // subtitles
    [...vid.querySelectorAll("track")].forEach((t) => t.remove());
    subs.forEach((s, i) => {
      const proxied = withBase("/api/proxy?url=" + encodeURIComponent(s.url) + "&type=vtt");
      const tr = document.createElement("track");
      tr.kind = "subtitles"; tr.label = s.label || "Indonesia"; tr.srclang = "id";
      tr.src = proxied; if (i === 0) tr.default = true;
      vid.appendChild(tr);
    });
    const sb = $("#subBadge");
    if (sb) sb.textContent = subs.length ? `Sub Indo (${subs.length})` : "Tanpa subtitle";
    if (note) {
      note.classList.remove("err");
      note.innerHTML = `✅ Stream aktif — <code>${esc(url.slice(0, 72))}…</code><br><small>URL bertanda waktu, bisa basi dalam ±1 jam. Muat ulang episode untuk refresh. ${subs.length ? subs.length + " subtitle terpasang." : ""}</small>`;
    }

    // play: hls vs native
    if (S.hls) { try { S.hls.destroy(); } catch {} S.hls = null; }
    const isHls = /\.m3u8(\?|$)/i.test(url);
    let src = url, viaProxy = false;
    const playNative = (u) => new Promise((resolve) => {
      vid.src = u;
      vid.load();
      const p = vid.play();
      if (p) p.then(resolve).catch(() => resolve());
      else resolve();
    });
    if (isHls && window.Hls && Hls.isSupported()) {
      S.hls = new Hls({ maxBufferLength: 30 });
      S.hls.loadSource(url);
      S.hls.attachMedia(vid);
      S.hls.on(Hls.Events.MANIFEST_PARSED, () => vid.play().catch(() => {}));
      S.hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal && !viaProxy) {
          viaProxy = true;
          try { S.hls.destroy(); } catch {}
          playNative(withBase("/api/proxy?url=" + encodeURIComponent(url) + "&type=video"));
        }
      });
    } else {
      await playNative(src);
    }
    $("#pstatus")?.classList.add("hidden");
    // error fallback → proxy
    vid.onerror = () => {
      if (!viaProxy) {
        viaProxy = true;
        toast("Stream langsung gagal — mencoba via proxy…");
        playNative(withBase("/api/proxy?url=" + encodeURIComponent(url) + "&type=video"));
      } else pstatus("❌ Video gagal dimuat.<br><small>Salin URL stream untuk mpv/VLC.</small>", true);
    };
    vid.onended = () => {
      const next = (opts.autoNext?.() ?? true) ? cur.number + 1 : -1;
      if (next > 0 && next <= w.episodeCount) {
        toast(`EP ${cur.number} selesai — lanjut EP ${next}`);
        location.hash = "#/w/" + slug + "/" + next;
      }
    };
  } catch (e) {
    pstatus("❌ " + esc(e.message) + "<br><small>Kemungkinan rate-limit sesaat — tunggu & ulangi.</small>", true);
    if (note) { note.classList.add("err"); note.textContent = "Gagal ambil stream: " + e.message; }
  }
}

/* ---------- favorit view ---------- */
function renderFav() {
  show("favorit");
  const grid = $("#favGrid");
  const slugs = [...S.fav];
  $("#favEmpty").style.display = slugs.length ? "none" : "";
  if (!slugs.length) { grid.innerHTML = ""; return; }
  grid.innerHTML = `<div class="empty">Memuat ${slugs.length} favorit…</div>`;
  Promise.all(slugs.map((s) => api(`/api/watch?slug=${encodeURIComponent(s)}`).catch(() => null)))
    .then((items) => {
      const valid = items.filter(Boolean);
      grid.innerHTML = valid.length ? valid.map((w) => cardHTML({
        slug: w.slug, title: w.title, episodes: w.episodeCount, platform: w.platform,
        cover: w.cover, cover_real: w.cover_real,
      })).join("") : `<div class="empty">Favorit tidak bisa dimuat (slug basi?). Hapus & tambah ulang.</div>`;
      bindCards(grid);
      // long-press/right-click to remove? add dblclick remove
      $$(".card", grid).forEach((c) => c.ondblclick = () => toggleFav(c.dataset.slug, null));
    });
}

/* ---------- router ---------- */
function show(name) {
  for (const v of ["home", "detail", "watch", "favorit"]) $("#view-" + v).classList.toggle("hidden", v !== name);
  $("#navHome").classList.toggle("active", name === "home");
  window.scrollTo({ top: 0 });
}

function route() {
  const h = location.hash || "#/";
  if (h.startsWith("#/d/")) return openDetail(decodeURIComponent(h.slice(4)));
  if (h.startsWith("#/w/")) {
    const [, , slug, ep] = h.split("/");
    return openWatch(decodeURIComponent(slug || ""), decodeURIComponent(ep || "1"));
  }
  if (h.startsWith("#/favorit")) return renderFav();
  return show("home");
}

/* ---------- events ---------- */
$("#searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const qv = $("#searchInput").value.trim();
  if (!qv) return;
  S.isSearch = true; S.query = qv; S.limit = 24;
  $$("#platformBar .chip").forEach((x) => x.classList.remove("on"));
  loadHome(true);
  if ((location.hash || "#/") !== "#/") location.hash = "#/";
  else show("home");
});
let deb = null;
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(deb);
  deb = setTimeout(() => {
    const qv = e.target.value.trim();
    if (!qv) {
      if (S.isSearch) { S.isSearch = false; S.query = ""; loadHome(true); }
      return;
    }
    S.isSearch = true; S.query = qv; S.limit = 24;
    loadHome(true);
    show("home");
  }, 600);
});
$("#btnMore").onclick = () => { S.limit += 24; loadHome(false); };
$$("[data-back]").forEach((b) => b.onclick = () => history.length > 1 ? history.back() : location.hash = "#/");
document.addEventListener("keydown", (e) => {
  const vid = $("#vid");
  if (!vid || $("#view-watch").classList.contains("hidden")) return;
  if (e.key === "ArrowRight") vid.currentTime += 5;
  if (e.key === "ArrowLeft") vid.currentTime -= 5;
  if (e.key === " ") { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
});

/* ---------- boot ---------- */
(async function boot() {
  saveFav();
  // Migrate "continue watching" entries saved before the /api/img fix:
  // old covers are raw .heic (unrenderable) or slow direct URLs.
  let migrated = false;
  for (const [slug, c] of Object.entries(S.cont)) {
    if (!c || typeof c !== "object") { delete S.cont[slug]; migrated = true; continue; }
    const cv = c.cover || "";
    if (cv.includes(".heic")) { c.cover = ""; migrated = true; }
    else if (cv.startsWith("http")) { c.cover = imgProxy(cv); migrated = true; }
  }
  if (migrated) saveCont();
  await loadPlatforms();
  await loadHome(true);
  route();
  window.addEventListener("hashchange", route);
})();
