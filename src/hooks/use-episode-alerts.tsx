import { useEffect, useState, useCallback } from "react";
import { getFavorites } from "@/lib/storage";
import { fetchDramaDetail, Drama } from "@/lib/api";

const EPISODE_CACHE_KEY = "dramabox_episode_counts";
const LAST_CHECK_KEY = "dramabox_last_alert_check";

interface EpisodeAlert {
  dramaId: string;
  dramaTitle: string;
  poster: string;
  newEpisodeCount: number;
  previousCount: number;
}

interface EpisodeCounts {
  [dramaId: string]: number;
}

export function useEpisodeAlerts() {
  const [alerts, setAlerts] = useState<EpisodeAlert[]>([]);
  const [checking, setChecking] = useState(false);

  const getStoredCounts = useCallback((): EpisodeCounts => {
    try {
      const stored = localStorage.getItem(EPISODE_CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const saveStoredCounts = useCallback((counts: EpisodeCounts) => {
    localStorage.setItem(EPISODE_CACHE_KEY, JSON.stringify(counts));
  }, []);

  const checkForNewEpisodes = useCallback(async () => {
    const favorites = getFavorites();
    if (favorites.length === 0) return;

    // Don't check more than once per hour
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const oneHour = 60 * 60 * 1000;
    if (lastCheck && Date.now() - parseInt(lastCheck) < oneHour) {
      return;
    }

    setChecking(true);
    const storedCounts = getStoredCounts();
    const newAlerts: EpisodeAlert[] = [];
    const updatedCounts: EpisodeCounts = { ...storedCounts };

    try {
      for (const drama of favorites.slice(0, 10)) { // Limit to first 10 favorites
        try {
          const detail = await fetchDramaDetail(drama.id);
          if (detail && detail.episodes) {
            const currentCount = detail.episodes;
            const previousCount = storedCounts[drama.id] || 0;

            if (previousCount > 0 && currentCount > previousCount) {
              newAlerts.push({
                dramaId: drama.id,
                dramaTitle: drama.title,
                poster: drama.poster,
                newEpisodeCount: currentCount,
                previousCount,
              });
            }

            updatedCounts[drama.id] = currentCount;
          }
        } catch (error) {
          console.error(`Error checking ${drama.title}:`, error);
        }
      }

      saveStoredCounts(updatedCounts);
      localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      setAlerts(newAlerts);
    } finally {
      setChecking(false);
    }
  }, [getStoredCounts, saveStoredCounts]);

  const dismissAlert = useCallback((dramaId: string) => {
    setAlerts((prev) => prev.filter((a) => a.dramaId !== dramaId));
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Check on mount
  useEffect(() => {
    checkForNewEpisodes();
  }, [checkForNewEpisodes]);

  return {
    alerts,
    checking,
    checkForNewEpisodes,
    dismissAlert,
    dismissAllAlerts,
  };
}
