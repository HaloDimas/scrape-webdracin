import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, CACHE } from "./_lib/common.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
  try {
    const data = await scraper.getPlatforms();
    return send(res, 200, data, CACHE.LONG);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

