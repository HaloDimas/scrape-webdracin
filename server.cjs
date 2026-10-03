#!/usr/bin/env node
// WebDracin Streaming Server — zero dependency (Node 18+)
// Serves public/ frontend + JSON API wrapping scrape.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const scraper = require("./scrape.cjs");

const PORT = +(process.env.PORT || 3000);
// Sub-path mount, e.g. BASE_PATH=/dracin when served behind a reverse
// proxy rewrite (Filmanesia /dracin/* → this server). Empty = serve at root.
const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/$/, "");
const PUBLIC = path.join(__dirname, "public");
const IMG_CACHE = path.join(__dirname, "cache", "img");

// ---- tiny TTL cache ----
const cache = new Map();
function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.t < ttlMs) return Promise.resolve(hit.data);
  return fn().then((data) => {
    // don't cache null videoUrl-only failures? still cache lists
    cache.set(key, { t: now, data });
    // cap size
    if (cache.size > 300) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
    return data;
  });
}
// periodic sweep
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.t > 15 * 60 * 1000) cache.delete(k);
}, 60 * 1000).unref();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".vtt": "text/vtt; charset=utf-8",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".mp4": "video/mp4",
};

function send(res, code, body, type = "application/json; charset=utf-8") {
  const buf = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cache-control": code === 200 && type.startsWith("application/json") ? "public, max-age=60" : "no-cache",
  });
  res.end(buf);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  // block traversal
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) return serveFile(res, path.join(file, "index.html"));
    if (err) {
      // SPA fallback: serve index.html for non-/api routes so deep links work
      if (!rel.startsWith("/api/")) return serveFile(res, path.join(PUBLIC, "index.html"), true);
      return send(res, 404, { error: "not found" });
    }
    serveFile(res, file);
  });
}

function serveFile(res, file, fallback = false) {
  fs.readFile(file, (err, data) => {
    if (err) {
      if (!fallback) { res.writeHead(404); return res.end("not found"); }
      return send(res, 404, { error: "not found" });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "access-control-allow-origin": "*",
      // app shell (html/js/css) must never stick in browser cache,
      // otherwise users keep running outdated frontend code
      "cache-control": ext === ".html" || ext === ".js" || ext === ".css"
        ? "no-cache"
        : "public, max-age=3600",
    });
    res.end(data);
  });
}

// Generic proxy for subtitles / covers / video fallback (fixes CORS + hotlink).
// Usage: /api/proxy?url=<encoded>&type=vtt|img|video
async function handleProxy(req, res, q) {
  const target = q.get("url");
  if (!target || !/^https?:\/\//i.test(target)) return send(res, 400, { error: "need ?url=https://..." });
  try {
    const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
    // forward Range for video seeking
    if (req.headers.range) headers.range = req.headers.range;
    if (q.get("type") === "vtt") headers.accept = "text/vtt,*/*";
    const upstream = await fetch(target, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      return send(res, 502, { error: "upstream " + upstream.status });
    }
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const out = { "access-control-allow-origin": "*", "content-type": ct };
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out[h] = v;
    }
    // cache subtitles/covers briefly at CDN level
    out["cache-control"] = "public, max-age=3600";
    res.writeHead(upstream.status, out);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (e) {
    send(res, 502, { error: String(e.message || e) });
  }
}

// Image proxy with disk cache: fixes slow / hotlink-protected covers.
// NOTE: upstream `cover_real` is often raw .heic (unrenderable in browsers),
// while webdracin /api/cover converts to a web-friendly format — so the
// frontend must prefer `cover`. Proxying through here adds disk caching
// (7 days) + browser caching so grids load fast on repeat visits.
async function handleImg(req, res, q) {
  const target = q.get("url");
  if (!target || !/^https?:\/\//i.test(target)) { res.writeHead(400); return res.end("need ?url="); }
  try {
    const hash = crypto.createHash("sha1").update(target).digest("hex");
    const file = path.join(IMG_CACHE, hash);
    const typeFile = file + ".type";
    try {
      const st = await fs.promises.stat(file);
      if (st.size > 0 && Date.now() - st.mtimeMs < 7 * 24 * 3600 * 1000) {
        const type = (await fs.promises.readFile(typeFile, "utf8").catch(() => "image/jpeg")).trim() || "image/jpeg";
        res.writeHead(200, {
          "content-type": type,
          "cache-control": "public, max-age=86400, immutable",
          "access-control-allow-origin": "*",
        });
        return fs.createReadStream(file).pipe(res);
      }
    } catch { /* cache miss → fetch upstream */ }
    const upstream = await fetch(target, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        accept: "image/avif,image/webp,image/*,*/*",
      },
    });
    if (!upstream.ok) { res.writeHead(502); return res.end("upstream " + upstream.status); }
    const ct = (upstream.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) { res.writeHead(502); return res.end("not an image"); }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) { res.writeHead(502); return res.end("empty"); }
    await fs.promises.mkdir(IMG_CACHE, { recursive: true });
    await Promise.all([fs.promises.writeFile(file, buf), fs.promises.writeFile(typeFile, ct)]);
    pruneImgCache();
    res.writeHead(200, {
      "content-type": ct,
      "cache-control": "public, max-age=86400, immutable",
      "access-control-allow-origin": "*",
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(502);
    res.end("img error");
  }
}

let pruning = false;
async function pruneImgCache() {
  if (pruning) return;
  pruning = true;
  try {
    const files = (await fs.promises.readdir(IMG_CACHE)).filter((f) => !f.endsWith(".type"));
    if (files.length > 800) {
      const stats = await Promise.all(files.map(async (f) => {
        const st = await fs.promises.stat(path.join(IMG_CACHE, f)).catch(() => null);
        return { f, t: st ? st.mtimeMs : 0 };
      }));
      stats.sort((a, b) => a.t - b.t);
      for (const s of stats.slice(0, files.length - 800)) {
        await fs.promises.unlink(path.join(IMG_CACHE, s.f)).catch(() => {});
        await fs.promises.unlink(path.join(IMG_CACHE, s.f + ".type")).catch(() => {});
      }
    }
  } catch { /* ignore */ } finally { pruning = false; }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "*",
      });
      return res.end();
    }
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const q = u.searchParams;
    // Strip BASE_PATH prefix so routing below always sees root-relative paths.
    let p = u.pathname;
    if (BASE_PATH && (p === BASE_PATH || p.startsWith(BASE_PATH + "/"))) {
      p = p.slice(BASE_PATH.length) || "/";
    }

    if (req.method !== "GET") return send(res, 405, { error: "GET only" });

    // ---- API ----
    if (p === "/api/health") return send(res, 200, { ok: true, time: new Date().toISOString() });
    if (p === "/api/cache/clear") { cache.clear(); return send(res, 200, { ok: true }); }

    if (p === "/api/platforms") {
      const data = await cached("platforms", 60 * 60 * 1000, () => scraper.getPlatforms());
      return send(res, 200, data);
    }
    if (p === "/api/platform-status") {
      // [{platform, ok}] — ok=false means the landing currently yields no dramas.
      // Probed in small chunks to avoid hammering upstream; cached 30 min.
      const plats = await cached("platforms", 60 * 60 * 1000, () => scraper.getPlatforms());
      const out = [];
      for (let i = 0; i < plats.length; i += 6) {
        const rs = await Promise.all(plats.slice(i, i + 6).map(async (pl) => {
          try {
            const items = await cached(`status:${pl}`, 30 * 60 * 1000, () => scraper.list(pl, 1));
            return { platform: pl, ok: items.length > 0 };
          } catch { return { platform: pl, ok: false }; }
        }));
        out.push(...rs);
      }
      return send(res, 200, out);
    }
    if (p === "/api/list") {
      const platform = q.get("platform") || null;
      const limit = Math.min(+(q.get("limit") || 24), 100);
      const key = `list:${platform || "home"}:${limit}`;
      const data = await cached(key, 5 * 60 * 1000, () => scraper.list(platform, limit));
      return send(res, 200, data);
    }
    if (p === "/api/all") {
      const lpp = Math.min(+(q.get("limitPerPlatform") || 5), 20);
      const plats = await cached("platforms", 60 * 60 * 1000, () => scraper.getPlatforms());
      const out = {};
      for (const pl of plats) {
        try {
          out[pl] = await cached(`list:${pl}:${lpp}`, 5 * 60 * 1000, () => scraper.list(pl, lpp));
        } catch { out[pl] = []; }
      }
      return send(res, 200, out);
    }
    if (p === "/api/search") {
      const query = (q.get("q") || "").trim();
      if (!query) return send(res, 400, { error: "need ?q=" });
      const limit = Math.min(+(q.get("limit") || 24), 100);
      const data = await cached(`search:${query}:${limit}`, 5 * 60 * 1000, () => scraper.search(query, limit));
      return send(res, 200, data);
    }
    if (p === "/api/drama") {
      const slug = (q.get("slug") || "").trim();
      if (!slug) return send(res, 400, { error: "need ?slug=" });
      const data = await cached(`drama:${slug}`, 10 * 60 * 1000, () => scraper.drama(slug));
      return send(res, 200, data);
    }
    if (p === "/api/watch") {
      const slug = (q.get("slug") || "").trim();
      if (!slug) return send(res, 400, { error: "need ?slug=" });
      const data = await cached(`watch:${slug}`, 10 * 60 * 1000, () => scraper.watch(slug));
      return send(res, 200, data);
    }
    if (p === "/api/episode") {
      const id = q.get("id"), ep = q.get("ep"), eid = q.get("eid");
      if (!id || !ep || !eid) return send(res, 400, { error: "need ?id=&ep=&eid=" });
      // NOTE: stream URLs are signed & short-lived → never cache long. Cache 2 min only.
      const data = await cached(`ep:${id}:${ep}:${eid}`, 2 * 60 * 1000, () => scraper.episode(id, ep, eid));
      return send(res, 200, data);
    }
    if (p === "/api/full") {
      const slug = (q.get("slug") || "").trim();
      const eps = Math.min(+(q.get("eps") || 3), 10);
      if (!slug) return send(res, 400, { error: "need ?slug=" });
      const w = await cached(`watch:${slug}`, 10 * 60 * 1000, () => scraper.watch(slug));
      const sample = [];
      for (const e of w.episodes.slice(0, eps)) {
        try {
          sample.push({ ...e, ...(await cached(`ep:${w.dramaId}:${e.number}:${e.id}`, 2 * 60 * 1000,
            () => scraper.episode(w.dramaId, e.number, e.id))) });
        } catch (err) { sample.push({ ...e, videoUrl: null, error: String(err.message || err) }); }
      }
      return send(res, 200, { ...w, episodes_sample: sample });
    }
    if (p === "/api/proxy") return handleProxy(req, res, q);
    if (p === "/api/img") return handleImg(req, res, q);

    // ---- static ----
    return serveStatic(req, res, p);
  } catch (e) {
    console.error("ERR", req.url, e.message);
    return send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`WebDracin streaming web running → http://localhost:${PORT}`);
  console.log(`API: /api/platforms /api/list?platform=dramabox /api/search?q= /api/watch?slug= /api/episode?id=&ep=&eid=`);
});
