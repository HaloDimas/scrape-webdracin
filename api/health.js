import { handleCors, send } from "./_lib/common.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return send(res, 405, { error: "GET only" });
  return send(res, 200, { ok: true, time: new Date().toISOString() }, "no-cache");
}

