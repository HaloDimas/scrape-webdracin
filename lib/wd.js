// Shared WebDracin backend for the Vercel catch-all api/[...all].js.
// Lives OUTSIDE api/ so Vercel doesn't count it as a function.
// Serverless is stateless: caching is via `Cache-Control: s-maxage=...`
// (Vercel edge cache) instead of in-memory Maps / disk.
import scraper from "../scrape.cjs";

export function handleCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function send(res, code, data, cache) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", cache || "no-cache");
  res.end(body);
}

// Standard CDN cache presets (edge caches GET responses with query strings).
export const CACHE = {
  NONE: "no-cache",
  SHORT: "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  MEDIUM: "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
  LONG: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
  // Signed/short-lived stream URLs — cache briefly only.
  EPHEMERAL: "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
  IMG: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400, immutable",
};

export function requireGet(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "GET only" });
    return false;
  }
  return true;
}

// Run async tasks with limited concurrency (gentle on upstream).
export async function batched(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const rs = await Promise.all(
      items.slice(i, i + size).map(async (it) => {
        try {
          return await fn(it);
        } catch {
          return null;
        }
      })
    );
    out.push(...rs);
  }
  return out;
}

export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

function err(res, e) {
  return send(res, 500, { error: String((e && e.message) || e) });
}

// ---- endpoint implementations (same behavior as the old per-file api/*) ----

export async function health(req, res) {
  return send(res, 200, { ok: true, time: new Date().toISOString() }, "no-cache");
}

export async function cacheClear(req, res) {
  // Compat shim: the old always-on server had an in-memory cache.
  // Serverless is edge-cached instead — nothing to clear.
  return send(res, 200, { ok: true, cleared: false, note: "serverless: edge cache only" });
}

export async function platforms(req, res) {
  try {
    return send(res, 200, await scraper.getPlatforms(), CACHE.LONG);
  } catch (e) {
    return err(res, e);
  }
}

export async function platformStatus(req, res) {
  try {
    const plats = await scraper.getPlatforms();
    const out = await batched(plats, 6, async (pl) => {
      try {
        const items = await scraper.list(pl, 1);
        return { platform: pl, ok: items.length > 0 };
      } catch {
        return { platform: pl, ok: false };
      }
    });
    return send(res, 200, out, CACHE.MEDIUM);
  } catch (e) {
    return err(res, e);
  }
}

export async function list(req, res) {
  try {
    const platform = req.query.platform || null;
    const limit = Math.min(+(req.query.limit || 24), 100);
    return send(res, 200, await scraper.list(platform, limit), CACHE.SHORT);
  } catch (e) {
    return err(res, e);
  }
}

export async function all(req, res) {
  try {
    const lpp = Math.min(+(req.query.limitPerPlatform || 5), 20);
    const plats = await scraper.getPlatforms();
    const pairs = await batched(plats, 6, async (pl) => {
      try {
        return [pl, await scraper.list(pl, lpp)];
      } catch {
        return [pl, []];
      }
    });
    return send(res, 200, Object.fromEntries(pairs), CACHE.MEDIUM);
  } catch (e) {
    return err(res, e);
  }
}

export async function search(req, res) {
  try {
    const query = (req.query.q || "").trim();
    if (!query) return send(res, 400, { error: "need ?q=" });
    const limit = Math.min(+(req.query.limit || 24), 100);
    return send(res, 200, await scraper.search(query, limit), CACHE.SHORT);
  } catch (e) {
    return err(res, e);
  }
}

export async function drama(req, res) {
  try {
    const slug = (req.query.slug || "").trim();
    if (!slug) return send(res, 400, { error: "need ?slug=" });
    return send(res, 200, await scraper.drama(slug), CACHE.MEDIUM);
  } catch (e) {
    return err(res, e);
  }
}

export async function watch(req, res) {
  try {
    const slug = (req.query.slug || "").trim();
    if (!slug) return send(res, 400, { error: "need ?slug=" });
    return send(res, 200, await scraper.watch(slug), CACHE.MEDIUM);
  } catch (e) {
    return err(res, e);
  }
}

export async function episode(req, res) {
  try {
    const { id, ep, eid } = req.query;
    if (!id || !ep || !eid) return send(res, 400, { error: "need ?id=&ep=&eid=" });
    // Stream URLs are signed & short-lived → cache briefly only.
    return send(res, 200, await scraper.episode(id, ep, eid), CACHE.EPHEMERAL);
  } catch (e) {
    return err(res, e);
  }
}

export async function full(req, res) {
  try {
    const slug = (req.query.slug || "").trim();
    const eps = Math.min(+(req.query.eps || 3), 10);
    if (!slug) return send(res, 400, { error: "need ?slug=" });
    const w = await scraper.watch(slug);
    const sample = await batched(w.episodes.slice(0, eps), 3, async (e) => {
      try {
        return { ...e, ...(await scraper.episode(w.dramaId, e.number, e.id)) };
      } catch (error) {
        return { ...e, videoUrl: null, error: String((error && error.message) || error) };
      }
    });
    return send(res, 200, { ...w, episodes_sample: sample }, CACHE.SHORT);
  } catch (e) {
    return err(res, e);
  }
}

// Generic proxy for subtitles / covers / video fallback (fixes CORS + hotlink).
// Streams the upstream body through (no buffering) so video seeks stay light.
export async function proxy(req, res) {
  const target = req.query.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    return send(res, 400, { error: "need ?url=https://..." });
  }
  try {
    const headers = { "user-agent": UA };
    if (req.headers.range) headers.range = req.headers.range;
    if (req.query.type === "vtt") headers.accept = "text/vtt,*/*";

    const upstream = await fetch(target, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      return send(res, 502, { error: "upstream " + upstream.status });
    }

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const out = { "Access-Control-Allow-Origin": "*", "Content-Type": ct };
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out[h] = v;
    }
    out["Cache-Control"] = "public, max-age=3600, s-maxage=3600";
    res.writeHead(upstream.status, out);

    if (!upstream.body) {
      res.end();
      return;
    }
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    return send(res, 502, { error: String((e && e.message) || e) });
  }
}

// Image proxy: fixes slow / hotlink-protected covers.
// NOTE: upstream `cover_real` is often raw .heic (unrenderable in browsers),
// so the frontend must prefer `cover`. Serverless has no disk cache —
// repeat loads are served from the Vercel edge cache instead.
export async function img(req, res) {
  const target = req.query.url;
  if (!target || !/^https?:\/\//i.test(target)) {
    res.statusCode = 400;
    res.end("need ?url=");
    return;
  }
  try {
    const upstream = await fetch(target, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/*,*/*" },
    });
    if (!upstream.ok) {
      res.statusCode = 502;
      res.end("upstream " + upstream.status);
      return;
    }
    const ct = (upstream.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) {
      res.statusCode = 502;
      res.end("not an image");
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) {
      res.statusCode = 502;
      res.end("empty");
      return;
    }
    res.writeHead(200, {
      "Content-Type": ct,
      "Cache-Control": CACHE.IMG,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
  } catch {
    res.statusCode = 502;
    res.end("img error");
  }
}
