import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, CACHE } from "./_lib/common.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const slug = (req.query.slug || "").trim();
    if (!slug) return send(res, 400, { error: "need ?slug=" });
    const data = await scraper.watch(slug);
    return send(res, 200, data, CACHE.MEDIUM);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

