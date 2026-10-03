import { useEffect, useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { DramaRow } from "@/components/DramaRow";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { DramaRowSkeleton } from "@/components/DramaCardSkeleton";
import { cn } from "@/lib/utils";
import {
  Drama,
  fetchTrending,
  fetchLatest,
  fetchForYou,
  fetchDubIndo,
  fetchMeloloTrending,
  fetchMeloloLatest,
  fetchNetShortForYou,
  fetchNetShortTheaters,
  fetchDramaDashHome,
  fetchDramaWaveHome,
  fetchFreeReelsHome,
  fetchStarShotHome,
} from "@/lib/api";
import { fetchWdList, wdToDrama } from "@/lib/webdracin";
import { getHomeCache, setHomeCache } from "@/hooks/use-home-cache";

type Tab = "discover" | "foryou";

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [trending, setTrending] = useState<Drama[]>([]);
  const [latest, setLatest] = useState<Drama[]>([]);
  const [forYou, setForYou] = useState<Drama[]>([]);
  const [dubIndo, setDubIndo] = useState<Drama[]>([]);
  const [meloloTrending, setMeloloTrending] = useState<Drama[]>([]);
  const [meloloLatest, setMeloloLatest] = useState<Drama[]>([]);
  const [netshortForYou, setNetshortForYou] = useState<Drama[]>([]);
  const [netshortTheaters, setNetshortTheaters] = useState<Drama[]>([]);
  const [dramadash, setDramadash] = useState<Drama[]>([]);
  const [dramawave, setDramawave] = useState<Drama[]>([]);
  const [freereels, setFreereels] = useState<Drama[]>([]);
  const [starshot, setStarshot] = useState<Drama[]>([]);
  const [dracin, setDracin] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  // WebDracin Sub Indo row — loads independently of the home cache.
  // NOTE: the legacy third-party upstreams (sansekai/drapi/melolo-azure)
  // are currently down, so the hero + rows fall back to Dracin content.
  useEffect(() => {
    fetchWdList("", 12)
      .then((cards) => setDracin(cards.map(wdToDrama)))
      .catch(() => setDracin([]));
  }, []);

  const heroDrama = trending[0] || dracin[0] || null;

  useEffect(() => {
    async function loadData() {
      // Try cache first
      const cached = getHomeCache();
      if (cached) {
        setTrending(cached.trending);
        setLatest(cached.latest);
        setForYou(cached.forYou);
        setDubIndo(cached.dubIndo);
        setMeloloTrending(cached.meloloTrending);
        setMeloloLatest(cached.meloloLatest);
        setNetshortForYou(cached.netshortForYou);
        setNetshortTheaters(cached.netshortTheaters);
        setDramadash(cached.dramadash);
        setDramawave(cached.dramawave);
        setFreereels(cached.freereels);
        setStarshot(cached.starshot);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [
          trendingData,
          latestData,
          forYouData,
          dubIndoData,
          meloloTrendingData,
          meloloLatestData,
          netshortForYouData,
          netshortTheatersData,
          dramadashData,
          dramawaveData,
          freereelsData,
          starshotData,
        ] = await Promise.all([
          fetchTrending(),
          fetchLatest(),
          fetchForYou(),
          fetchDubIndo(),
          fetchMeloloTrending(),
          fetchMeloloLatest(),
          fetchNetShortForYou(),
          fetchNetShortTheaters(),
          fetchDramaDashHome(),
          fetchDramaWaveHome(),
          fetchFreeReelsHome(),
          fetchStarShotHome(),
        ]);
        
        setTrending(trendingData);
        setLatest(latestData);
        setForYou(forYouData);
        setDubIndo(dubIndoData);
        setMeloloTrending(meloloTrendingData);
        setMeloloLatest(meloloLatestData);
        setNetshortForYou(netshortForYouData);
        setNetshortTheaters(netshortTheatersData);
        setDramadash(dramadashData);
        setDramawave(dramawaveData);
        setFreereels(freereelsData);
        setStarshot(starshotData);

        // Save to cache
        setHomeCache({
          trending: trendingData,
          latest: latestData,
          forYou: forYouData,
          dubIndo: dubIndoData,
          meloloTrending: meloloTrendingData,
          meloloLatest: meloloLatestData,
          netshortForYou: netshortForYouData,
          netshortTheaters: netshortTheatersData,
          dramadash: dramadashData,
          dramawave: dramawaveData,
          freereels: freereelsData,
          starshot: starshotData,
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Hero Section */}
      <HeroSection drama={heroDrama} />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-center gap-8 py-3">
          <button
            onClick={() => setActiveTab("discover")}
            className={cn(
              "text-sm font-medium transition-colors",
              activeTab === "discover"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab("foryou")}
            className={cn(
              "text-sm font-medium transition-colors",
              activeTab === "foryou"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            For you
          </button>
        </div>
      </div>

      {/* Content sections */}
      <div className="mt-4 space-y-8">
        {/* Continue Watching */}
        <ContinueWatchingRow />

        {activeTab === "discover" ? (
          <>
            {/* Trending */}
            {loading ? (
              <DramaRowSkeleton />
            ) : (
              <DramaRow
                title="🔥 Trending Now"
                dramas={trending}
                size="large"
              />
            )}

            {/* Melolo Trending */}
            {loading ? (
              <DramaRowSkeleton />
            ) : meloloTrending.length > 0 ? (
              <DramaRow
                title="🎬 Melolo Hot"
                dramas={meloloTrending}
              />
            ) : null}

            {/* NetShort For You */}
            {loading ? (
              <DramaRowSkeleton />
            ) : netshortForYou.length > 0 ? (
              <DramaRow
                title="📱 NetShort Popular"
                dramas={netshortForYou}
              />
            ) : null}

            {/* Latest */}
            {loading ? (
              <DramaRowSkeleton />
            ) : (
              <DramaRow
                title="🆕 Latest Drama"
                dramas={latest}
              />
            )}

            {/* Melolo Latest */}
            {loading ? (
              <DramaRowSkeleton />
            ) : meloloLatest.length > 0 ? (
              <DramaRow
                title="📺 Melolo New"
                dramas={meloloLatest}
              />
            ) : null}

            {/* NetShort Theaters */}
            {loading ? (
              <DramaRowSkeleton />
            ) : netshortTheaters.length > 0 ? (
              <DramaRow
                title="🎭 NetShort Theaters"
                dramas={netshortTheaters}
              />
            ) : null}

            {/* DramaDash */}
            {loading ? (
              <DramaRowSkeleton />
            ) : dramadash.length > 0 ? (
              <DramaRow
                title="📺 DramaDash"
                dramas={dramadash}
              />
            ) : null}

            {/* DramaWave */}
            {loading ? (
              <DramaRowSkeleton />
            ) : dramawave.length > 0 ? (
              <DramaRow
                title="🌊 DramaWave"
                dramas={dramawave}
              />
            ) : null}

            {/* FreeReels */}
            {loading ? (
              <DramaRowSkeleton />
            ) : freereels.length > 0 ? (
              <DramaRow
                title="🎞️ FreeReels"
                dramas={freereels}
              />
            ) : null}

            {/* StarShot */}
            {loading ? (
              <DramaRowSkeleton />
            ) : starshot.length > 0 ? (
              <DramaRow
                title="⭐ StarShot"
                dramas={starshot}
              />
            ) : null}

            {/* WebDracin Sub Indo */}
            {!loading && dracin.length > 0 ? (
              <DramaRow
                title="🎭 DracinPlay • Sub Indo"
                dramas={dracin}
                seeAllLink="/dracin"
              />
            ) : null}

            {/* Indonesian Dubbed */}
            {loading ? (
              <DramaRowSkeleton />
            ) : (
              <DramaRow
                title="🇮🇩 Indonesian Dubbed"
                dramas={dubIndo}
              />
            )}
          </>
        ) : (
          <>
            {/* For You Tab Content */}
            {loading ? (
              <DramaRowSkeleton />
            ) : (
              <DramaRow
                title="✨ Recommended For You"
                dramas={forYou}
                size="large"
              />
            )}

            {loading ? (
              <DramaRowSkeleton />
            ) : meloloTrending.length > 0 ? (
              <DramaRow
                title="🎬 Melolo Picks"
                dramas={meloloTrending}
              />
            ) : null}

            {loading ? (
              <DramaRowSkeleton />
            ) : netshortForYou.length > 0 ? (
              <DramaRow
                title="📱 NetShort For You"
                dramas={netshortForYou}
              />
            ) : null}

            {/* DramaDash */}
            {loading ? (
              <DramaRowSkeleton />
            ) : dramadash.length > 0 ? (
              <DramaRow
                title="📺 DramaDash Picks"
                dramas={dramadash}
              />
            ) : null}

            {/* DramaWave */}
            {loading ? (
              <DramaRowSkeleton />
            ) : dramawave.length > 0 ? (
              <DramaRow
                title="🌊 DramaWave Picks"
                dramas={dramawave}
              />
            ) : null}

            {/* FreeReels */}
            {loading ? (
              <DramaRowSkeleton />
            ) : freereels.length > 0 ? (
              <DramaRow
                title="🎞️ FreeReels Picks"
                dramas={freereels}
              />
            ) : null}

            {/* StarShot */}
            {loading ? (
              <DramaRowSkeleton />
            ) : starshot.length > 0 ? (
              <DramaRow
                title="⭐ StarShot Picks"
                dramas={starshot}
              />
            ) : null}

            {loading ? (
              <DramaRowSkeleton />
            ) : (
              <DramaRow
                title="🔥 Hot Right Now"
                dramas={trending}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
