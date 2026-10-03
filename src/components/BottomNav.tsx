import { Link, useLocation } from "react-router-dom";
import { Home, Search, Heart, History, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home", canFill: true },
  { path: "/search", icon: Search, label: "Search", canFill: false },
  { path: "/favorites", icon: Heart, label: "Favorites", canFill: true },
  { path: "/history", icon: History, label: "History", canFill: false },
  { path: "/more", icon: MoreHorizontal, label: "More", canFill: false },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, icon: Icon, label, canFill }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform",
                  isActive && "scale-110"
                )}
                fill={isActive && canFill ? "currentColor" : "none"}
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
