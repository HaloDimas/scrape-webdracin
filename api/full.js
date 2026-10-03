import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, batched, CACHE } from "./_lib/common.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const slug = (req.query.slug || "").trim();
    const eps = Math.min(+(req.query.eps || 3), 10);
    if (!slug) return send(res, 400, { error: "need ?slug=" });
    const w = await scraper.watch(slug);
    const sample = await batched(w.episodes.slice(0, eps), 3, async (e) => {
      try {
        return { ...e, ...(await scraper.episode(w.dramaId, e.number, e.id)) };
      } catch (err) {
        return { ...e, videoUrl: null, error: String((err && err.message) || err) };
      }
    });
    return send(res, 200, { ...w, episodes_sample: sample }, CACHE.SHORT);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

