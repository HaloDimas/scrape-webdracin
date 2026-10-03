import { useEffect, useState } from "react";
import { DramaCard } from "@/components/DramaCard";
import { DramaCardSkeleton } from "@/components/DramaCardSkeleton";
import { Drama } from "@/lib/api";
import { fetchWdPlatforms, fetchWdList, wdToDrama } from "@/lib/webdracin";
import { cn } from "@/lib/utils";

export default function Dracin() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);

  useEffect(() => {
    fetchWdPlatforms()
      .then(setPlatforms)
      .catch(() => setPlatforms([]));
  }, []);

  useEffect(() => {
    async function load() {
      if (platform === "" && dramas.length > 0) {
        // initial load already done below; skip duplicate
      }
      setLoadingGrid(true);
      try {
        const cards = await fetchWdList(platform, 24);
        setDramas(cards.map(wdToDrama));
      } catch (error) {
        console.error("Error loading WebDracin list:", error);
        setDramas([]);
      } finally {
        setLoadingGrid(false);
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <h1 className="text-2xl font-bold text-foreground">DracinPlay • Sub Indo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          25 platform webdracin.com — {platform ? `platform ${platform}` : "beranda"} •{" "}
          <a href="/classic/" className="text-primary hover:underline">
            classic player
          </a>
        </p>
      </div>

      {/* Platform chips */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          onClick={() => setPlatform("")}
          className={cn(
            "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            platform === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          🏠 Beranda
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={cn(
              "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              platform === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {loading || loadingGrid ? (
        <div className="mt-4 grid grid-cols-3 gap-3 px-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <DramaCardSkeleton key={i} size="small" />
          ))}
        </div>
      ) : dramas.length === 0 ? (
        <div className="mt-16 px-4 text-center">
          <h3 className="text-lg font-semibold text-foreground">Tidak ada hasil</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba platform lain — sebagian landing sedang kosong.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 px-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {dramas.map((d) => (
            <DramaCard key={d.id} drama={d} size="small" showSource className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
