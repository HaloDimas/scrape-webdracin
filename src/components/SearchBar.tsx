import { Search, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  defaultValue?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({
  className,
  autoFocus = false,
  defaultValue = "",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex w-full items-center transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "relative flex w-full items-center overflow-hidden rounded-full border transition-all duration-200",
          isFocused
            ? "border-primary/50 bg-background shadow-lg shadow-primary/10"
            : "border-border/50 bg-muted/80"
        )}
      >
        <Search
          className={cn(
            "absolute left-4 h-4 w-4 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search dramas..."
          className="h-11 w-full bg-transparent pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors hover:bg-muted-foreground/30"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </form>
  );
}
