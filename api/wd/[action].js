import * as wd from "../../lib/wd.js";

// Single function for the whole WebDracin backend (Hobby plan caps at 12
// functions; this + dramabox-proxy = 2). Reached via vercel.json rewrites:
//   /api/<action>  →  /api/wd/<action>   (query string preserved)
export const config = { maxDuration: 60 };

const ROUTES = {
  health: wd.health,
  "cache-clear": wd.cacheClear,
  platforms: wd.platforms,
  "platform-status": wd.platformStatus,
  list: wd.list,
  all: wd.all,
  search: wd.search,
  drama: wd.drama,
  watch: wd.watch,
  episode: wd.episode,
  full: wd.full,
  proxy: wd.proxy,
  img: wd.img,
};

export default async function handler(req, res) {
  if (wd.handleCors(req, res)) return;
  if (!wd.requireGet(req, res)) return;

  const action = req.query.action;
  const fn = ROUTES[action];
  if (!fn) {
    return wd.send(res, 404, {
      error: "unknown api action",
      known: Object.keys(ROUTES),
    });
  }
  try {
    await fn(req, res);
  } catch (e) {
    wd.send(res, 500, { error: String((e && e.message) || e) });
  }
}
