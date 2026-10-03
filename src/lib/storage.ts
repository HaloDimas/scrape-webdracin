import { Drama, DramaSource } from "./api";

const FAVORITES_KEY = "dramabox_favorites";
const CONTINUE_KEY = "dramabox_continue_v2";
const HISTORY_KEY = "dramabox_history";
const DRAMA_CACHE_KEY = "dramabox_drama_cache";

export interface ContinueWatching {
  dramaId: string;
  drama: Drama;
  episodeId: string;
  episodeNumber: number;
  timestamp: number;
  progress: number;
  updatedAt: number;
  source: DramaSource;
}

export interface WatchHistoryItem {
  dramaId: string;
  drama: Drama;
  episodeNumber: number;
  watchedAt: number;
}

// Favorites
export function getFavorites(): Drama[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addFavorite(drama: Drama): void {
  const favorites = getFavorites();
  if (!favorites.find((f) => f.id === drama.id)) {
    favorites.unshift(drama);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export function removeFavorite(dramaId: string): void {
  const favorites = getFavorites().filter((f) => f.id !== dramaId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function isFavorite(dramaId: string): boolean {
  return getFavorites().some((f) => f.id === dramaId);
}

// Save drama to cache for back navigation
export function saveDramaToCache(drama: Drama): void {
  try {
    const cache = getDramaCache();
    cache[drama.id] = { drama, savedAt: Date.now() };
    
    // Keep only 50 most recent dramas
    const entries = Object.entries(cache)
      .sort((a, b) => b[1].savedAt - a[1].savedAt)
      .slice(0, 50);
    
    localStorage.setItem(DRAMA_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    console.error('[Storage] Error saving drama to cache:', error);
  }
}

function getDramaCache(): Record<string, { drama: Drama; savedAt: number }> {
  try {
    const data = localStorage.getItem(DRAMA_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getDramaFromStorage(dramaId: string): Drama | null {
  // Try drama cache first (most recent)
  const cache = getDramaCache();
  const fromCache = cache[dramaId];
  if (fromCache?.drama?.title && !fromCache.drama.title.startsWith('Drama ')) {
    return fromCache.drama;
  }
  
  // Try favorites
  const favorites = getFavorites();
  const fromFav = favorites.find((f) => f.id === dramaId);
  if (fromFav) return fromFav;
  
  // Try continue watching
  const continueWatching = getContinueWatching();
  const fromContinue = continueWatching.find((c) => c.dramaId === dramaId);
  if (fromContinue?.drama?.title && !fromContinue.drama.title.startsWith('Drama ')) {
    return fromContinue.drama;
  }
  
  // Try history
  const history = getWatchHistory();
  const fromHistory = history.find((h) => h.dramaId === dramaId);
  if (fromHistory?.drama?.title && !fromHistory.drama.title.startsWith('Drama ')) {
    return fromHistory.drama;
  }
  
  return null;
}

// Continue Watching - Rebuilt from scratch
export function getContinueWatching(): ContinueWatching[] {
  try {
    const data = localStorage.getItem(CONTINUE_KEY);
    if (!data) return [];
    
    const items: ContinueWatching[] = JSON.parse(data);
    // Validate and filter out any corrupt entries
    return items.filter(item => 
      item && 
      item.dramaId && 
      item.episodeId && 
      item.drama && 
      typeof item.timestamp === 'number' &&
      typeof item.progress === 'number'
    );
  } catch (error) {
    console.error('[Storage] Error reading continue watching:', error);
    return [];
  }
}

export function saveContinueWatching(
  drama: Drama,
  episodeId: string,
  episodeNumber: number,
  timestamp: number,
  duration: number,
  source: DramaSource
): void {
  try {
    // Save even from 2 seconds onwards, but skip if near the end
    if (timestamp < 2) {
      return;
    }
    
    // If near the end (95%+), don't save
    if (duration > 0 && timestamp >= duration * 0.95) {
      return;
    }
    
    const progress = duration > 0 ? Math.min((timestamp / duration) * 100, 95) : 0;
    
    const newItem: ContinueWatching = {
      dramaId: drama.id,
      drama,
      episodeId,
      episodeNumber,
      timestamp: Math.floor(timestamp),
      progress,
      updatedAt: Date.now(),
      source,
    };
    
    let items = getContinueWatching();
    
    // Remove existing entry for this drama
    items = items.filter(i => i.dramaId !== drama.id);
    
    // Add new entry at the start
    items.unshift(newItem);
    
    // Keep only last 10 items
    items = items.slice(0, 10);
    
    localStorage.setItem(CONTINUE_KEY, JSON.stringify(items));
    
  } catch (error) {
    console.error('[Storage] Error saving continue watching:', error);
  }
}

export function getSavedTimestamp(dramaId: string, episodeId: string): number | null {
  try {
    const items = getContinueWatching();
    const item = items.find(i => i.dramaId === dramaId && i.episodeId === episodeId);
    if (item && item.timestamp > 5) {
      
      return item.timestamp;
    }
    return null;
  } catch {
    return null;
  }
}

export function removeContinueWatching(dramaId: string): void {
  const items = getContinueWatching().filter((i) => i.dramaId !== dramaId);
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(items));
}

// Legacy function for compatibility
export function updateContinueWatching(item: ContinueWatching): void {
  saveContinueWatching(
    item.drama,
    item.episodeId,
    item.episodeNumber,
    item.timestamp,
    item.timestamp / (item.progress / 100) || 0,
    item.source || 'dramabox'
  );
}

// Helper to validate drama data
function isValidDramaData(drama: Drama | null | undefined): boolean {
  if (!drama) return false;
  if (!drama.id || !drama.title || !drama.poster) return false;
  // Filter out generic titles like "Drama 6y633NSZeE"
  if (drama.title.startsWith('Drama ') && drama.title.length < 20) return false;
  return true;
}

// Watch History
export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    
    const items: WatchHistoryItem[] = JSON.parse(data);
    // Filter out invalid entries
    return items.filter(item => 
      item && 
      item.dramaId && 
      item.episodeNumber && 
      isValidDramaData(item.drama)
    );
  } catch {
    return [];
  }
}

export function addToHistory(drama: Drama, episodeNumber: number): void {
  let history = getWatchHistory();
  // Remove existing entry for this drama/episode
  history = history.filter(
    (h) => !(h.dramaId === drama.id && h.episodeNumber === episodeNumber)
  );
  history.unshift({
    dramaId: drama.id,
    drama,
    episodeNumber,
    watchedAt: Date.now(),
  });
  // Keep only last 20 items
  history = history.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function isEpisodeWatched(dramaId: string, episodeNumber: number): boolean {
  return getWatchHistory().some(
    (h) => h.dramaId === dramaId && h.episodeNumber === episodeNumber
  );
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
