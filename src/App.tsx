import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BottomNav } from "@/components/BottomNav";
import { QuickResumeButton } from "@/components/QuickResumeButton";
import { EpisodeAlertBanner } from "@/components/EpisodeAlertBanner";
import { useEpisodeAlerts } from "@/hooks/use-episode-alerts";
import { useAutoTheme } from "@/hooks/use-auto-theme";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Favorites from "./pages/Favorites";
import History from "./pages/History";
import More from "./pages/More";
import Dracin from "./pages/Dracin";
import DramaDetail from "./pages/DramaDetail";
import Watch from "./pages/Watch";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DMCA from "./pages/DMCA";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const hideBottomNav = location.pathname.startsWith("/watch/");
  const { alerts, dismissAlert, dismissAllAlerts } = useEpisodeAlerts();
  
  // Auto theme hook - applies dark mode automatically at night
  useAutoTheme();

  return (
    <>
      {/* Episode release alerts */}
      <EpisodeAlertBanner
        alerts={alerts}
        onDismiss={dismissAlert}
        onDismissAll={dismissAllAlerts}
      />
      
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<Search />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/history" element={<History />} />
        <Route path="/more" element={<More />} />
        <Route path="/dracin" element={<Dracin />} />
        <Route path="/drama/:source/:id" element={<DramaDetail />} />
        <Route path="/drama/:id" element={<DramaDetail />} />
        <Route path="/watch/:source/:dramaId/:episodeId" element={<Watch />} />
        <Route path="/watch/:dramaId/:episodeId" element={<Watch />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dmca" element={<DMCA />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {!hideBottomNav && <BottomNav />}
      
      {/* Quick resume floating button */}
      <QuickResumeButton />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
