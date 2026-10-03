import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingSpinner";
import {
  Drama,
  Episode,
  DramaSource,
  fetchDramaDetail,
  fetchEpisodes,
} from "@/lib/api";
import {
  isFavorite,
  addFavorite,
  removeFavorite,
  isEpisodeWatched,
  getDramaFromStorage,
  saveDramaToCache,
} from "@/lib/storage";
import { getEpisodesCache, setEpisodesCache } from "@/hooks/use-home-cache";
import { imgFallback } from "@/lib/webdracin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LocationState {
  drama?: Drama;
}

export default function DramaDetail() {
  const { id, source: sourceParam } = useParams<{ id: string; source?: string }>();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const source: DramaSource = (sourceParam as DramaSource) || 'dramabox';
  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadDrama() {
      // Check navigation state first
      const passedDrama = locationState?.drama;
      
      // Check stored drama before API call
      const storedDrama = getDramaFromStorage(id!);
      
      // Check episodes cache
      const cachedEpisodes = getEpisodesCache(id!);
      
      // If we have all cached data, use it immediately
      if ((passedDrama || storedDrama) && cachedEpisodes) {
        const dramaTouse = passedDrama || storedDrama;
        setDrama(dramaTouse);
        setEpisodes(cachedEpisodes);
        setFavorite(isFavorite(id!));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [dramaData, episodesData] = await Promise.all([
          fetchDramaDetail(id!, source),
          cachedEpisodes ? Promise.resolve(cachedEpisodes) : fetchEpisodes(id!, source),
        ]);
        
        // Priority: passed drama > stored drama > API drama
        // Only use API drama if it has valid data
        let finalDrama = dramaData;
        const hasValidApiData = dramaData && 
          dramaData.poster && 
          dramaData.title && 
          !dramaData.title.startsWith('Drama ');
        
        if (!hasValidApiData) {
          if (passedDrama && passedDrama.id === id && passedDrama.title && !passedDrama.title.startsWith('Drama ')) {
            finalDrama = { ...passedDrama, episodes: episodesData.length || passedDrama.episodes };
          } else if (storedDrama) {
            finalDrama = { ...storedDrama, episodes: episodesData.length || storedDrama.episodes };
          }
        }
        
        // Save valid drama to cache for future back navigation
        if (finalDrama && finalDrama.title && !finalDrama.title.startsWith('Drama ')) {
          saveDramaToCache(finalDrama);
        }
        
        // Cache episodes
        if (episodesData.length > 0 && !cachedEpisodes) {
          setEpisodesCache(id!, episodesData);
        }
        
        setDrama(finalDrama);
        setEpisodes(episodesData);
        setFavorite(isFavorite(id!));
      } catch (error) {
        console.error("Error loading drama:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDrama();
  }, [id, source, locationState]);

  const toggleFavorite = () => {
    if (!drama) return;
    if (favorite) {
      removeFavorite(drama.id);
      toast.success("Removed from favorites");
    } else {
      addFavorite(drama);
      toast.success("Added to favorites");
    }
    setFavorite(!favorite);
  };

  const handleShare = async () => {
    if (navigator.share && drama) {
      try {
        await navigator.share({
          title: drama.title,
          text: `Watch ${drama.title} on DramaStream`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!drama) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Drama not found
          </h2>
          <Link to="/" className="mt-4 text-primary hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[300px]">
        <img
          src={drama.poster}
          alt={drama.title}
          className="h-full w-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => imgFallback(e, drama.poster)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {/* Actions */}
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            onClick={toggleFavorite}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm transition-all",
              favorite
                ? "bg-primary text-primary-foreground"
                : "bg-background/60 hover:bg-background/80"
            )}
          >
            <Heart className="h-5 w-5" fill={favorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm transition-colors hover:bg-background/80"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="-mt-20 relative z-10 px-4">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {drama.title}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {drama.rating && (
            <span className="flex items-center gap-1 font-medium text-primary">
              ⭐ {drama.rating}
            </span>
          )}
          {drama.year && <span>• {drama.year}</span>}
          {drama.episodes && <span>• {drama.episodes} Eps</span>}
          {drama.status && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                drama.status === "Completed"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary/20 text-primary"
              )}
            >
              {drama.status}
            </span>
          )}
        </div>

        {drama.genre && drama.genre.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {drama.genre.map((g) => (
              <span
                key={g}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {drama.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {drama.description}
          </p>
        )}

        {/* Watch button */}
        {episodes.length > 0 && (
          <Link to={`/watch/${source}/${drama.id}/${episodes[0].id}`} state={{ drama }}>
            <Button size="lg" className="mt-6 w-full gap-2 font-semibold">
              <Play className="h-5 w-5 fill-current" />
              Watch Episode 1
            </Button>
          </Link>
        )}

        {/* Episodes list */}
        {episodes.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Episodes ({episodes.length})
            </h2>
            <div className="space-y-2">
              {episodes.map((episode) => {
                const watched = isEpisodeWatched(drama.id, episode.number);
                return (
                  <Link
                    key={episode.id}
                    to={`/watch/${source}/${drama.id}/${episode.id}`}
                    state={{ drama }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl bg-card p-3 transition-all hover:bg-muted",
                      watched && "opacity-70"
                    )}
                  >
                    <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {(episode.thumbnail || drama.poster) ? (
                        <img
                          src={episode.thumbnail || drama.poster}
                          alt={episode.title || `Episode ${episode.number}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => imgFallback(e, episode.thumbnail || drama.poster)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-8 w-8 fill-foreground text-foreground" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        Episode {episode.number}
                      </h3>
                      {episode.title && episode.title !== `Episode ${episode.number}` && episode.title !== String(episode.number) && (
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {episode.title}
                        </p>
                      )}
                      {watched && (
                        <span className="text-xs text-primary">Watched</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
