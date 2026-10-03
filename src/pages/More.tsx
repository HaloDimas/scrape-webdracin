import { Link } from "react-router-dom";
import {
  Shield,
  FileText,
  AlertCircle,
  Mail,
  ExternalLink,
  Clapperboard,
  MonitorPlay,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAutoTheme } from "@/hooks/use-auto-theme";
import logo from "@/assets/logo.png";

const menuItems = [
  { icon: Clapperboard, label: "DracinPlay • Sub Indo", href: "/dracin" },
  { icon: Shield, label: "Privacy Policy", href: "/privacy" },
  { icon: FileText, label: "Terms of Service", href: "/terms" },
  { icon: AlertCircle, label: "DMCA", href: "/dmca" },
  { icon: Mail, label: "Contact Us", href: "/contact" },
];

const externalItems = [
  { icon: MonitorPlay, label: "Classic player (/classic)", href: "/classic/" },
];

export default function More() {
  const { mode, setMode, isNightTime } = useAutoTheme();

  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <h1 className="mb-6 text-2xl font-bold text-foreground">More</h1>

        {/* App info */}
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent p-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden">
            <img src={logo} alt="DramaStream" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-xl font-bold text-foreground">DramaStream</h2>
          <p className="mt-1 text-sm text-muted-foreground">Free drama streaming</p>
          <p className="mt-2 text-xs text-muted-foreground/70">Version 1.0.0</p>
        </div>

        {/* Theme Toggle */}
        <div className="mb-6 rounded-xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-foreground">Theme</span>
            {isNightTime && mode === "auto" && (
              <span className="text-xs text-muted-foreground">🌙 Night mode active</span>
            )}
          </div>
          <ThemeToggle mode={mode} onModeChange={setMode} />
        </div>

        {/* Menu items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {externalItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-xl bg-muted/50 p-4 text-center text-xs text-muted-foreground">
          <p>This service is ad-supported and free to use. All content is provided by third-party APIs.</p>
        </div>
      </div>
    </div>
  );
}
