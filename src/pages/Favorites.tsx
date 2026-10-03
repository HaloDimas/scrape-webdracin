import { useState, useEffect } from "react";
import { DramaCard } from "@/components/DramaCard";
import { DramaRow } from "@/components/DramaRow";
import { getFavorites } from "@/lib/storage";
import { fetchForYou, Drama } from "@/lib/api";
import { Heart } from "lucide-react";

export default function Favorites() {
  const [favorites, setFavorites] = useState<Drama[]>([]);
  const [recommendations, setRecommendations] = useState<Drama[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    fetchForYou().then(setRecommendations);

    // Listen for storage changes
    const handleStorageChange = () => {
      setFavorites(getFavorites());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          My Favorites
        </h1>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No favorites yet
            </h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tap the heart icon on any drama to add it to your favorites
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {favorites.map((drama, index) => (
              <DramaCard
                key={drama.id || index}
                drama={drama}
                size="small"
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>

      {favorites.length === 0 && recommendations.length > 0 && (
        <div className="mt-8">
          <DramaRow
            title="Recommended for You"
            dramas={recommendations}
          />
        </div>
      )}
    </div>
  );
}
