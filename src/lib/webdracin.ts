// WebDracin client — talks to the serverless /api/* functions in this repo
// (scraped from webdracin.com: 25 platforms, Sub Indo). Works both locally
// (node server.cjs) and on Vercel (api/*.js). No Supabase needed.
import type { Drama, Episode, SearchResult, SubtitleTrack } from "./api";

export interface WdCard {
  slug: string;
  url: string;
  title: string | null;
  episodes: number | null;
  platform: string | null;
  cover: string | null;
  cover_real: string | null;
}

export interface WdEpisode {
  id: string;
  number: number;
  label?: string;
  free?: boolean;
  poster?: string;
  poster_real?: string;
  videoUrl?: string | null;
}

export interface WdWatch {
  slug: string;
  dramaId: string;
  title: string;
  synopsis: string | null;
  platform: string;
  episodeCount: number;
  cover: string | null;
  cover_real: string | null;
  playable?: boolean;
  episodes: WdEpisode[];
}

export interface WdStream {
  videoUrl: string | null;
  subtitles?: Array<string | { url?: string; src?: string; file?: string; label?: string; lang?: string; name?: string }>;
}

async function wd<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const e = await r.json();
      if (e?.error) msg = e.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const fetchWdPlatforms = () => wd<string[]>("/api/platforms");

export const fetchWdList = (platform = "", limit = 24) =>
  wd<WdCard[]>(
    platform
      ? `/api/list?platform=${encodeURIComponent(platform)}&limit=${limit}`
      : `/api/list?limit=${limit}`
  );

export const fetchWdSearch = (q: string, limit = 24) =>
  wd<WdCard[]>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);

export const fetchWdWatch = (slug: string) =>
  wd<WdWatch>(`/api/watch?slug=${encodeURIComponent(slug)}`);

export const fetchWdEpisode = (dramaId: string, ep: number, eid: string) =>
  wd<WdStream>(
    `/api/episode?id=${encodeURIComponent(dramaId)}&ep=${ep}&eid=${encodeURIComponent(eid)}`
  );

// Prefer `cover` (web-friendly) over `cover_real` (often raw .heic).
// Route through /api/img so repeat loads hit the edge cache.
export function wdPoster(c: Pick<WdCard, "cover" | "cover_real">): string {
  const raw = c.cover || c.cover_real || "";
  return raw ? `/api/img?url=${encodeURIComponent(raw)}` : "";
}

export function wdToDrama(c: WdCard): Drama {
  return {
    id: c.slug,
    title: c.title || c.slug,
    poster: wdPoster(c),
    episodes: c.episodes ?? undefined,
    genre: c.platform ? [c.platform] : undefined,
    source: "webdracin",
  };
}

export function wdEpisodes(w: WdWatch): Episode[] {
  return w.episodes.map((e) => ({
    id: String(e.id),
    number: e.number,
    title: e.label || `Episode ${e.number}`,
    thumbnail: e.poster ? `/api/img?url=${encodeURIComponent(e.poster)}` : wdPoster(w),
  }));
}

export function wdToDramaDetail(w: WdWatch): Drama {
  return {
    id: w.slug,
    title: w.title,
    poster: wdPoster(w),
    description: w.synopsis ?? undefined,
    episodes: w.episodeCount,
    genre: w.platform ? [w.platform] : undefined,
    source: "webdracin",
  };
}

export function wdSearchResults(cards: WdCard[]): SearchResult[] {
  return cards.map((c) => ({
    id: c.slug,
    title: c.title || c.slug,
    poster: wdPoster(c),
    source: "webdracin",
  }));
}

// Normalize scraper subtitles to player tracks, proxied to dodge CORS.
export function wdSubtitleTracks(subs: WdStream["subtitles"]): SubtitleTrack[] {
  if (!Array.isArray(subs)) return [];
  return subs
    .map((s, i) => {
      if (typeof s === "string") {
        return {
          url: `/api/proxy?url=${encodeURIComponent(s)}&type=vtt`,
          lang: "id",
          label: "Indonesia",
        };
      }
      const url = s.url || s.src || s.file || "";
      if (!url) return null;
      return {
        url: `/api/proxy?url=${encodeURIComponent(url)}&type=vtt`,
        lang: s.lang || "id",
        label: s.label || s.name || `Subtitle ${i + 1}`,
      };
    })
    .filter((s): s is SubtitleTrack => s !== null);
}
