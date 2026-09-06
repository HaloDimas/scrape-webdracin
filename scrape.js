#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const BASE = "https://webdracin.com";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

const get = async (url) => (await fetch(url, { headers: UA })).text();

function rsc(html) {
  const out = [];
  const re = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse('"' + m[1] + '"')); } catch { out.push(m[1]); }
  }
  return out.join("\n");
}

const abs = (u) => (u?.startsWith("http") ? u.replace(/&amp;/g, "&") : u ? BASE + u.replace(/&amp;/g, "&") : null);

const realCover = (u) => {
  try {
    const x = new URL(abs(u));
    return x.pathname === "/api/cover" ? decodeURIComponent(x.searchParams.get("url")) : abs(u);
  } catch {
    return abs(u);
  }
};

function parseCards(html, limit = Infinity) {
  const cards = [...html.matchAll(/<a[^>]+href="(\/drama\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Map();
  for (const [, href, inner] of cards) {
    if (seen.has(href)) continue;
    const txt = (s) => (inner.match(s)?.[1] || "").replace(/<[^>]+>/g, "").trim() || null;
    seen.set(href, {
      slug: href.split("/drama/")[1],
      url: abs(href),
      title: txt(/line-clamp-2[^>]*>([^<]+)</) || txt(/font-semibold[^>]*>([^<]+)</),
      episodes: +(inner.match(/EP[\s\S]*?(\d+)/)?.[1] || 0) || null,
      platform: txt(/truncate[^>]*>([^<]+)</),
      cover: abs(inner.match(/src="([^"]+)"/)?.[1]),
      cover_real: realCover(inner.match(/src="([^"]+)"/)?.[1])
    });
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

async function getPlatforms() {
  const sm = await get(BASE + "/sitemap.xml");
  const slugs = [...sm.matchAll(/<loc>https:\/\/webdracin\.com\/([a-z0-9]+)gratis<\/loc>/g)].map(m => m[1]);
  return slugs.length ? slugs : [
    "melolo","dramabox","cashdrama","shotshort","dramabite","dramapops","netshort",
    "playlet","flareflow","reelshort","dramadash","dramamax","dramawave","vigloo",
    "velolo","cubetv","minutedrama","rapidtv","dramanova","freereels","flextv",
    "dramarush","shortbox","radreels","flickreels"
  ];
}

async function list(platform = null, limit = 50) {
  const url = platform ? `${BASE}/${platform.toLowerCase().replace(/gratis$/, "")}gratis` : BASE + "/";
  const html = await get(url);
  return parseCards(html, limit);
}

async function all(limitPerPlatform = 10) {
  const plats = await getPlatforms();
  const results = {};
  for (const p of plats) {
    try {
      results[p] = await list(p, limitPerPlatform);
      console.error(`[ok] ${p}: ${results[p].length}`);
    } catch (e) {
      console.error(`[err] ${p}: ${e.message}`);
      results[p] = [];
    }
  }
  return results;
}

async function search(query, limit = 50) {
  const html = await get(`${BASE}/search?q=${encodeURIComponent(query)}`);
  return parseCards(html, limit);
}

async function drama(slug) {
  const url = `${BASE}/drama/${slug}`;
  const html = await get(url);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .find((j) => j?.["@graph"]?.some((n) => n["@type"] === "TVSeries"));
  const series = ld?.["@graph"]?.find((n) => n["@type"] === "TVSeries") ?? {};
  const eps = [...new Set([...html.matchAll(/\/watch\/[^"?]+\?ep=(\d+)/g)].map((m) => +m[1]))].sort((a, b) => a - b);
  return {
    slug,
    url,
    title: series.name ?? html.match(/<title>([^<]+)/)?.[1] ?? null,
    synopsis: series.description ?? null,
    cover: abs(html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]),
    episodeCount: series.numberOfEpisodes ?? (eps.at(-1) ?? null),
    episodes_listed: eps,
    watch_url: abs(html.match(/href="(\/watch\/[^"]+)"/)?.[1])
  };
}

async function watch(slug) {
  const html = await get(`${BASE}/watch/${slug}?ep=1`);
  const payload = rsc(html);
  const i = payload.indexOf('"drama":{');
  if (i < 0) throw new Error("drama object not found in RSC");
  let s = payload.slice(payload.indexOf("{", i + 8));
  let d = 0, instr = false, esc = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (instr) {
      esc = c === "\\" && !esc;
      if (c === '"' && !esc) instr = false;
      if (c !== "\\") esc = false;
      continue;
    }
    if (c === '"') instr = true;
    else if (c === "{") d++;
    else if (c === "}") {
      d--;
      if (!d) { s = s.slice(0, k + 1); break; }
    }
  }
  const raw = JSON.parse(s.replace(/"\$undefined"/g, "null"));
  const eps = raw.episodes.map((e) => ({ ...e, poster_real: realCover(e.poster) }));
  return {
    slug,
    dramaId: raw.id,
    title: raw.title,
    synopsis: raw.synopsis,
    platform: raw.platform ?? raw.platformLabel,
    episodeCount: raw.episodeCount ?? eps.length,
    cover: abs(raw.cover),
    cover_real: realCover(raw.cover),
    playable: raw.playable,
    episodes: eps
  };
}

async function episode(dramaId, ep, eid) {
  const r = await fetch(`${BASE}/api/episode?id=${encodeURIComponent(dramaId)}&ep=${ep}&eid=${eid}`, { headers: UA });
  if (!r.ok) throw new Error("api/episode HTTP " + r.status);
  return r.json();
}

(async () => {
  const [mode, a, b, c] = process.argv.slice(2);
  const opt = (k, d) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : d; };
  const save = (f, data) => {
    if (!f) return;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    console.error("saved -> " + f);
  };
  try {
    if (mode === "platforms") {
      const p = await getPlatforms();
      save(opt("out", null), p);
      console.log(JSON.stringify(p, null, 2));
    } else if (mode === "list") {
      const r = await list(opt("platform", null), +opt("limit", 50));
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else if (mode === "all") {
      const r = await all(+opt("limitPerPlatform", 10));
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else if (mode === "search") {
      if (!a) throw new Error("need query");
      const r = await search(a, +opt("limit", 50));
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else if (mode === "drama") {
      if (!a) throw new Error("need slug");
      const r = await drama(a);
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else if (mode === "watch") {
      if (!a) throw new Error("need slug");
      const r = await watch(a);
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else if (mode === "episode") {
      if (!a || !b || !c) throw new Error("need dramaId ep eid");
      console.log(JSON.stringify(await episode(a, b, c), null, 2));
    } else if (mode === "full") {
      if (!a) throw new Error("need slug");
      const w = await watch(a);
      const n = +opt("eps", 3);
      const withVideo = [];
      for (const e of w.episodes.slice(0, n)) {
        withVideo.push({ ...e, ...(await episode(w.dramaId, e.number, e.id)) });
      }
      const r = { ...w, episodes_sample: withVideo };
      save(opt("out", null), r);
      console.log(JSON.stringify(r, null, 2));
    } else {
      console.error("usage: node scrape.js platforms|list|all|search|drama|watch|episode|full");
      process.exit(1);
    }
  } catch (e) {
    console.error("ERROR: " + e.message);
    process.exit(1);
  }
})();
