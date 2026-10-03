import scraper from "../scrape.cjs";
import { handleCors, send, requireGet, batched, CACHE } from "./_lib/common.js";

export const config = { maxDuration: 60 };

// Scrapes every platform landing in parallel batches.
// Keep limitPerPlatform small (<=5) — this is the heaviest endpoint.
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (!requireGet(req, res)) return;
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
    return send(res, 500, { error: String((e && e.message) || e) });
  }
}

