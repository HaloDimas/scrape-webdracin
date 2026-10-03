import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowLeft, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Animated film icon */}
        <div className="relative mx-auto mb-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
            <Film className="h-16 w-16 text-muted-foreground animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
            ?
          </div>
        </div>

        {/* Error text */}
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <h2 className="mb-3 text-xl font-semibold text-foreground">
          Drama Not Found
        </h2>
        <p className="mb-8 text-muted-foreground">
          Oops! The page you're looking for seems to have gone off-script. 
          It might have been removed or the URL is incorrect.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/search">
              <Search className="h-4 w-4" />
              Search Dramas
            </Link>
          </Button>
        </div>

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back to previous page
        </button>
      </div>
    </div>
  );
};

export default NotFound;
