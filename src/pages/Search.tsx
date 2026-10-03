import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { DramaCard } from "@/components/DramaCard";
import { DramaCardSkeleton } from "@/components/DramaCardSkeleton";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { searchDramas, fetchPopularSearches, SearchResult, DramaSource } from "@/lib/api";
import { TrendingUp, Search as SearchIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceFilter = 'all' | DramaSource;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  useEffect(() => {
    fetchPopularSearches().then(setPopularSearches);
  }, []);

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchDramas(searchQuery);
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (q: string) => {
    setSearchParams({ q });
  };

  const handlePopularClick = (term: string) => {
    setSearchParams({ q: term });
  };

  // Filter results by source
  const filteredResults = results.filter(r => 
    sourceFilter === 'all' || r.source === sourceFilter
  );

  // Count by source
  const dramaboxCount = results.filter(r => r.source === 'dramabox').length;
  const meloloCount = results.filter(r => r.source === 'melolo').length;
  const netshortCount = results.filter(r => r.source === 'netshort').length;
  const dramadashCount = results.filter(r => r.source === 'dramadash').length;
  const dramawaveCount = results.filter(r => r.source === 'dramawave').length;
  const freereelsCount = results.filter(r => r.source === 'freereels').length;
  const starshotCount = results.filter(r => r.source === 'starshot').length;
  const webdracinCount = results.filter(r => r.source === 'webdracin').length;

  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Search</h1>
        <SearchBar
          autoFocus
          defaultValue={query}
          onSearch={handleSearchSubmit}
        />
      </div>

      {/* Continue Watching section in search */}
      {!searched && !loading && (
        <div className="mt-6">
          <ContinueWatchingRow />
        </div>
      )}

      {!searched && !loading && (
        <div className="mt-8 px-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Popular Searches
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term, index) => (
              <button
                key={index}
                onClick={() => handlePopularClick(term)}
                className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-8 grid grid-cols-3 gap-3 px-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <DramaCardSkeleton key={i} size="small" />
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No results found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try searching with different keywords
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-6 px-4">
          {/* Source filter tabs */}
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSourceFilter('all')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'all'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setSourceFilter('dramabox')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'dramabox'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                DramaBox ({dramaboxCount})
              </button>
              <button
                onClick={() => setSourceFilter('melolo')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'melolo'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Melolo ({meloloCount})
              </button>
              <button
                onClick={() => setSourceFilter('netshort')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'netshort'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                NetShort ({netshortCount})
              </button>
              <button
                onClick={() => setSourceFilter('dramadash')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'dramadash'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                DramaDash ({dramadashCount})
              </button>
              <button
                onClick={() => setSourceFilter('dramawave')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'dramawave'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                DramaWave ({dramawaveCount})
              </button>
              <button
                onClick={() => setSourceFilter('freereels')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'freereels'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                FreeReels ({freereelsCount})
              </button>
              <button
                onClick={() => setSourceFilter('starshot')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'starshot'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                StarShot ({starshotCount})
              </button>
              <button
                onClick={() => setSourceFilter('webdracin')}
                className={cn(
                  "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sourceFilter === 'webdracin'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Dracin Sub Indo ({webdracinCount})
              </button>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Found {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} for "{query}"
          </p>
          
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredResults.map((result, index) => (
              <DramaCard
                key={`${result.source}-${result.id}-${index}`}
                drama={{
                  ...result,
                  source: result.source,
                } as any}
                size="small"
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
