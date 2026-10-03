import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Hls from "hls.js";
import { ArrowLeft, ChevronLeft, ChevronRight, List, X, Play, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingSpinner";
import { AutoPlayNextOverlay } from "@/components/AutoPlayNextOverlay";
import { VideoGestureOverlay } from "@/components/VideoGestureOverlay";
import { VideoQualitySelector } from "@/components/VideoQualitySelector";
import { PlaybackSpeedControl } from "@/components/PlaybackSpeedControl";
import { useMobileGestures } from "@/hooks/use-mobile-gestures";
import {
  Drama,
  Episode,
  DramaSource,
  VideoQuality,
  SubtitleTrack,
  fetchDramaDetail,
  fetchEpisodes,
  fetchStreamWithQuality,
  fetchDrapiStream,
  fetchWebdracinStream,
  fetchNetShortEpisodesWithSubtitles,
  getProxiedVideoUrl,
} from "@/lib/api";
import {
  addToHistory,
  saveContinueWatching,
  isEpisodeWatched,
  getSavedTimestamp,
  getDramaFromStorage,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

type SortOrder = "oldest" | "newest";

interface LocationState {
  drama?: Drama;
}

export default function Watch() {
  const { dramaId, episodeId, source: sourceParam } = useParams<{
    dramaId: string;
    episodeId: string;
    source?: string;
  }>();
  const source: DramaSource = (sourceParam as DramaSource) || 'dramabox';
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const urlTimestamp = searchParams.get('t');
  const navigate = useNavigate();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const seekApplied = useRef(false);
  const targetSeekTime = useRef<number | null>(null);
  
  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showAutoPlay, setShowAutoPlay] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [currentQuality, setCurrentQuality] = useState<number>(1080);
  const [qualityOptions, setQualityOptions] = useState<VideoQuality[]>([]);

  const currentIndex = episodes.findIndex((ep) => ep.id === episodeId);
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;

  // Mobile gesture handlers
  const handleSeekForward = useCallback(() => {
    if (videoRef.current) videoRef.current.currentTime += 10;
  }, []);

  const handleSeekBackward = useCallback(() => {
    if (videoRef.current) videoRef.current.currentTime -= 10;
  }, []);

  const handleVolumeUp = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
  }, []);

  const handleVolumeDown = useCallback(() => {
    if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
  }, []);

  const handleSpeedUp = useCallback(() => {
    if (videoRef.current) videoRef.current.playbackRate = 1.5;
  }, []);

  const handleSpeedNormal = useCallback(() => {
    if (videoRef.current) videoRef.current.playbackRate = 1;
  }, []);

  const { gestureText } = useMobileGestures(videoContainerRef, {
    onSwipeRight: handleSeekForward,
    onSwipeLeft: handleSeekBackward,
    onSwipeUp: handleVolumeUp,
    onSwipeDown: handleVolumeDown,
    onDoubleTapLeft: handleSeekBackward,
    onDoubleTapRight: handleSeekForward,
    onLongPressStart: handleSpeedUp,
    onLongPressEnd: handleSpeedNormal,
  });

  // Sort episodes
  const sortedEpisodes = [...episodes].sort((a, b) => {
    return sortOrder === "newest" ? b.number - a.number : a.number - b.number;
  });

  // Load drama and episode data
  useEffect(() => {
    if (!dramaId || !episodeId) return;

    async function loadData() {
      setLoading(true);
      setVideoUrl(null);
      setSubtitles([]);
      setQualityOptions([]);
      seekApplied.current = false;
      targetSeekTime.current = null;
      
      try {
        const [dramaData, episodesData] = await Promise.all([
          fetchDramaDetail(dramaId!, source),
          fetchEpisodes(dramaId!, source),
        ]);
        
        // Use navigation state drama, stored drama, or API drama (priority order)
        const passedDrama = locationState?.drama;
        let finalDrama = dramaData;
        
        if (!dramaData || !dramaData.poster || dramaData.title?.startsWith('Drama ')) {
          if (passedDrama && passedDrama.id === dramaId) {
            finalDrama = { ...passedDrama, episodes: episodesData.length || passedDrama.episodes };
          } else {
            const storedDrama = getDramaFromStorage(dramaId!);
            if (storedDrama) {
              finalDrama = { ...storedDrama, episodes: episodesData.length || storedDrama.episodes };
            }
          }
        }
        
        setDrama(finalDrama);
        setEpisodes(episodesData);
        
        const episode = episodesData.find((ep: Episode) => ep.id === episodeId);
        setCurrentEpisode(episode || null);


        // Determine seek time - URL param takes priority, then localStorage
        if (urlTimestamp) {
          const ts = parseFloat(urlTimestamp);
          if (!isNaN(ts) && ts > 0) {
            targetSeekTime.current = ts;
            
          }
        } else {
          const savedTs = getSavedTimestamp(dramaId!, episodeId!);
          if (savedTs && savedTs > 5) {
            targetSeekTime.current = savedTs;
            
          }
        }

        // Get video URL based on source
        if (source === 'melolo' && episode) {
          
          try {
            const streamResult = await fetchStreamWithQuality(episode.id, source);
            
            if (streamResult && streamResult.url) {
              if (streamResult.qualityOptions?.length > 0) {
                setQualityOptions(streamResult.qualityOptions);
                const availableQualities = streamResult.qualityOptions.map(q => q.quality);
                const selectedQuality = availableQualities.includes(currentQuality)
                  ? currentQuality
                  : availableQualities.find(q => q <= currentQuality) || availableQualities[0];
                setCurrentQuality(selectedQuality);
                const selectedOption = streamResult.qualityOptions.find(q => q.quality === selectedQuality);
                const finalUrl = selectedOption?.url || streamResult.url;
                setVideoUrl(finalUrl);
                
              } else {
                setVideoUrl(streamResult.url);
                
              }
            } else {
              
            }
          } catch (streamError) {
            
          }
        } else if (['dramadash', 'dramawave', 'freereels', 'starshot'].includes(source) && episode) {
          // DRAPI sources - need to fetch stream URL separately
          console.log(`[Watch] Fetching ${source} stream for drama ${dramaId}, episode ${episode.number}`);
          try {
            const streamResult = await fetchDrapiStream(dramaId!, episode.number, source as 'dramadash' | 'dramawave' | 'freereels' | 'starshot');
            if (streamResult.url) {
              setVideoUrl(streamResult.url);
              setSubtitles(streamResult.subtitles);
              console.log(`[Watch] Got ${source} stream URL with ${streamResult.subtitles.length} subtitle tracks`);
            } else {
              // Fallback to episode videoUrl if available
              setVideoUrl(episode.videoUrl || null);
              setSubtitles([]);
              console.log(`[Watch] No ${source} stream, using episode URL`);
            }
          } catch (streamError) {
            console.error(`[Watch] Error fetching ${source} stream:`, streamError);
            setVideoUrl(episode.videoUrl || null);
            setSubtitles([]);
          }
        } else if (source === 'netshort' && episode) {
          // NetShort - video URL is in episode data, fetch subtitles separately
          console.log('[Watch] NetShort: Using episode video URL with subtitles');
          setVideoUrl(episode.videoUrl || null);
          
          // Fetch subtitles for this episode
          try {
            const netshortResult = await fetchNetShortEpisodesWithSubtitles(dramaId!);
            const episodeSubs = netshortResult.subtitlesByEpisode.get(episode.id) || [];
            setSubtitles(episodeSubs);
            console.log(`[Watch] NetShort: Found ${episodeSubs.length} subtitle tracks`);
          } catch (subError) {
            console.error('[Watch] Error fetching NetShort subtitles:', subError);
            setSubtitles([]);
          }
        } else if (source === 'webdracin' && episode) {
          // WebDracin (Sub Indo) - signed stream URL fetched per episode
          console.log('[Watch] WebDracin: fetching stream for', dramaId, 'EP', episode.number);
          try {
            const streamResult = await fetchWebdracinStream(dramaId!, episode.number, episode.id);
            setVideoUrl(streamResult.url);
            setSubtitles(streamResult.subtitles);
            console.log(`[Watch] WebDracin: stream ${streamResult.url ? 'found' : 'null'} with ${streamResult.subtitles.length} subtitle tracks`);
          } catch (streamError) {
            console.error('[Watch] Error fetching WebDracin stream:', streamError);
            setVideoUrl(null);
            setSubtitles([]);
          }
        } else if (episode) {
          // DramaBox - video URL is in episode data, needs proxy for CORS
          console.log('[Watch] Using episode video URL:', episode.videoUrl ? 'found' : 'not found');
          if (episode.qualityOptions?.length > 0) {
            setQualityOptions(episode.qualityOptions);
            const availableQualities = episode.qualityOptions.map(q => q.quality);
            const selectedQuality = availableQualities.includes(currentQuality)
              ? currentQuality
              : availableQualities.find(q => q <= currentQuality) || availableQualities[0];
            setCurrentQuality(selectedQuality);
            const selectedOption = episode.qualityOptions.find(q => q.quality === selectedQuality);
            const rawUrl = selectedOption?.url || episode.videoUrl || null;
            setVideoUrl(rawUrl ? getProxiedVideoUrl(rawUrl, source) : null);
          } else {
            const rawUrl = episode.videoUrl || null;
            setVideoUrl(rawUrl ? getProxiedVideoUrl(rawUrl, source) : null);
          }
        }

        // Use finalDrama (with complete data) for history instead of dramaData
        if (finalDrama && episode && finalDrama.poster && finalDrama.title && !finalDrama.title.startsWith('Drama ')) {
          addToHistory(finalDrama, episode.number);
        }
      } catch (error) {
        console.error("Error loading watch data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    setShowAutoPlay(false);
  }, [dramaId, episodeId, source]);

  const hlsRef = useRef<Hls | null>(null);

  // Setup HLS.js for m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        // Apply seek after HLS loads
        if (!seekApplied.current && targetSeekTime.current !== null) {
          const target = targetSeekTime.current;
          if (!video.duration || target < video.duration * 0.95) {
            video.currentTime = target;
          }
          seekApplied.current = true;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data.type);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      // Native HLS (Safari) or non-HLS video
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // Apply seek when video is ready (for non-HLS or Safari)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Skip if HLS.js is handling this
    const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('m3u8');
    if (isHls && Hls.isSupported()) return;

    const handleCanPlay = () => {
      if (seekApplied.current || targetSeekTime.current === null) return;
      
      const target = targetSeekTime.current;
      // Don't seek past 95% of duration
      if (video.duration && target >= video.duration * 0.95) {
        console.log('[Watch] Skipping seek - too close to end');
        seekApplied.current = true;
        return;
      }
      
      console.log('[Watch] Seeking to:', target);
      video.currentTime = target;
      seekApplied.current = true;
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadedmetadata', handleCanPlay);
    
    // If video is already ready, try immediately
    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleCanPlay);
    };
  }, [videoUrl]);

  // Save progress periodically and on key events - but only after video loads
  useEffect(() => {
    if (!drama || !currentEpisode || !videoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    let intervalId: NodeJS.Timeout | null = null;
    let isSetup = false;

    const saveProgress = () => {
      if (!video.duration || video.duration === 0 || isNaN(video.duration)) {
        return;
      }
      if (video.currentTime < 2) {
        return; // Don't save if just started
      }
      
      
      saveContinueWatching(
        drama,
        currentEpisode.id,
        currentEpisode.number,
        video.currentTime,
        video.duration,
        source
      );
    };

    const setupSaveHandlers = () => {
      if (isSetup) return;
      isSetup = true;
      
      
      // Start periodic save
      intervalId = setInterval(saveProgress, 10000);
    };
    
    // Wait for video to have metadata before setting up handlers
    const handleLoadedMetadata = () => {
      
      if (video.duration && video.duration > 0) {
        setupSaveHandlers();
      }
    };

    const handleCanPlay = () => {
      if (video.duration && video.duration > 0) {
        setupSaveHandlers();
      }
    };

    // Save on pause
    const handlePause = () => {
      if (video.duration && video.duration > 0) {
        saveProgress();
      }
    };

    // Save periodically during playback
    const handleTimeUpdate = () => {
      if (video.duration && video.duration > 0 && video.currentTime > 5 && Math.floor(video.currentTime) % 30 === 0) {
        saveProgress();
      }
    };

    const handleBeforeUnload = () => {
      if (video.duration && video.duration > 0) {
        saveProgress();
      }
    };

    // If video is already ready
    if (video.readyState >= 1 && video.duration && video.duration > 0) {
      setupSaveHandlers();
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Save on cleanup if video is ready
      if (video.duration && video.duration > 0 && video.currentTime > 2) {
        saveProgress();
      }
      if (intervalId) clearInterval(intervalId);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [drama, currentEpisode, source, videoUrl]);

  // Handle video ended - show auto play next
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (nextEpisode) {
        setShowAutoPlay(true);
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [nextEpisode]);

  const goToEpisode = (episode: Episode) => {
    navigate(`/watch/${source}/${dramaId}/${episode.id}`);
    setShowEpisodes(false);
  };

  const handleQualityChange = (quality: number) => {
    const video = videoRef.current;
    const currentTime = video?.currentTime || 0;
    const selectedOption = qualityOptions.find(q => q.quality === quality);
    
    if (selectedOption) {
      setCurrentQuality(quality);
      targetSeekTime.current = currentTime;
      seekApplied.current = false;
      // Use proxy for DramaBox videos
      setVideoUrl(getProxiedVideoUrl(selectedOption.url, source));
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!drama || !currentEpisode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Episode not found</h2>
          <Link to="/" className="mt-4 text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen?.();
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player - Full width, takes most of the screen */}
      <div ref={videoContainerRef} className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
        {videoUrl ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            controls
            autoPlay
            playsInline
            crossOrigin="anonymous"
          >
            {subtitles.map((sub, index) => (
              <track
                key={`${sub.lang}-${index}`}
                kind="subtitles"
                src={sub.url}
                srcLang={sub.lang.split('-')[0]}
                label={sub.label}
                default={sub.lang.startsWith('en')}
              />
            ))}
          </video>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <p className="text-muted-foreground">Video not available</p>
          </div>
        )}

        <VideoGestureOverlay text={gestureText} />

        {showAutoPlay && nextEpisode && (
          <AutoPlayNextOverlay
            nextEpisode={nextEpisode}
            onPlay={() => goToEpisode(nextEpisode)}
            onCancel={() => setShowAutoPlay(false)}
          />
        )}

        {/* Back button */}
        <Link
          to={`/drama/${source}/${dramaId}`}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>

        {/* Top right controls */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <PlaybackSpeedControl videoRef={videoRef} />
          {qualityOptions.length > 1 && (
            <VideoQualitySelector
              options={qualityOptions}
              currentQuality={currentQuality}
              onQualityChange={handleQualityChange}
            />
          )}
          <button
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <Maximize className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Right side floating buttons */}
        <div className="absolute bottom-24 right-4 flex flex-col items-center gap-4">
          {/* Auto next toggle */}
          <button
            onClick={() => setShowAutoPlay(prev => !prev)}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs text-white">Auto next</span>
          </button>
          
          {/* Episode list button */}
          <button
            onClick={() => setShowEpisodes(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
              <List className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs text-white">Daftar</span>
          </button>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background px-4 py-3 pb-safe">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="truncate font-medium text-foreground">{drama.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                {source === 'dramabox' ? 'DramaBox' : source.charAt(0).toUpperCase() + source.slice(1)}
              </span>
              <span>{currentEpisode.number}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={!prevEpisode}
              onClick={() => prevEpisode && goToEpisode(prevEpisode)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!nextEpisode}
              onClick={() => nextEpisode && goToEpisode(nextEpisode)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Episode List Overlay */}
      {showEpisodes && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-foreground">Daftar Episode</h2>
            <button
              onClick={() => setShowEpisodes(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Episode Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15">
              {sortedEpisodes.map((ep) => {
                const watched = isEpisodeWatched(dramaId!, ep.number);
                return (
                  <button
                    key={ep.id}
                    onClick={() => goToEpisode(ep)}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                      ep.id === episodeId
                        ? "bg-primary text-primary-foreground"
                        : watched
                        ? "bg-muted/50 text-muted-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {ep.number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
