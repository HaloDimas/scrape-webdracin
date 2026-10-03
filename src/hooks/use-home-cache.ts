import { Drama } from "@/lib/api";

const HOME_CACHE_KEY = "dramabox_home_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface HomeData {
  trending: Drama[];
  latest: Drama[];
  forYou: Drama[];
  dubIndo: Drama[];
  meloloTrending: Drama[];
  meloloLatest: Drama[];
  netshortForYou: Drama[];
  netshortTheaters: Drama[];
  dramadash: Drama[];
  dramawave: Drama[];
  freereels: Drama[];
  starshot: Drama[];
}

interface CachedHomeData {
  data: HomeData;
  cachedAt: number;
}

export function getHomeCache(): HomeData | null {
  try {
    const cached = localStorage.getItem(HOME_CACHE_KEY);
    if (!cached) return null;
    
    const { data, cachedAt }: CachedHomeData = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - cachedAt > CACHE_DURATION) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

export function setHomeCache(data: HomeData): void {
  try {
    const cached: CachedHomeData = {
      data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('[HomeCache] Error saving cache:', error);
  }
}

// Episode cache for drama details
const EPISODES_CACHE_KEY = "dramabox_episodes_cache";
const EPISODES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface EpisodeCacheEntry {
  episodes: any[];
  cachedAt: number;
}

export function getEpisodesCache(dramaId: string): any[] | null {
  try {
    const cached = localStorage.getItem(EPISODES_CACHE_KEY);
    if (!cached) return null;
    
    const cacheMap: Record<string, EpisodeCacheEntry> = JSON.parse(cached);
    const entry = cacheMap[dramaId];
    
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.cachedAt > EPISODES_CACHE_DURATION) {
      return null;
    }
    
    return entry.episodes;
  } catch {
    return null;
  }
}

export function setEpisodesCache(dramaId: string, episodes: any[]): void {
  try {
    const cached = localStorage.getItem(EPISODES_CACHE_KEY);
    const cacheMap: Record<string, EpisodeCacheEntry> = cached ? JSON.parse(cached) : {};
    
    cacheMap[dramaId] = {
      episodes,
      cachedAt: Date.now(),
    };
    
    // Keep only last 20 drama episode caches
    const entries = Object.entries(cacheMap)
      .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
      .slice(0, 20);
    
    localStorage.setItem(EPISODES_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    console.error('[EpisodesCache] Error saving cache:', error);
  }
}
