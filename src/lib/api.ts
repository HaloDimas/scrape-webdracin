import {
  fetchWdSearch,
  fetchWdWatch,
  fetchWdEpisode,
  wdSearchResults,
  wdToDramaDetail,
  wdEpisodes,
  wdSubtitleTracks,
} from "./webdracin";

// Backend for the drama APIs. Prefers the same-deploy serverless proxy
// (/api/dramabox-proxy, Vercel) so no Supabase project is required.
// Set VITE_SUPABASE_URL to keep using the old Supabase edge function,
// or VITE_PROXY_BASE to point at any compatible proxy explicitly.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PROXY_BASE =
  (import.meta.env.VITE_PROXY_BASE as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/dramabox-proxy` : "/api/dramabox-proxy");

// Helper to proxy video URLs through our edge function (for CORS-blocked streams)
export function getProxiedVideoUrl(url: string, source: DramaSource): string {
  // DramaBox videos need proxying due to CORS restrictions
  if (source === 'dramabox' && url.includes('dramaboxdb.com')) {
    return `${PROXY_BASE}?videoUrl=${encodeURIComponent(url)}`;
  }
  return url;
}

export type DramaSource = 'dramabox' | 'melolo' | 'netshort' | 'dramadash' | 'dramawave' | 'freereels' | 'starshot' | 'webdracin';

export interface Drama {
  id: string;
  title: string;
  poster: string;
  description?: string;
  genre?: string[];
  rating?: number;
  episodes?: number;
  status?: string;
  year?: string;
  viewCount?: number;
  source: DramaSource;
}

export interface VideoQuality {
  quality: number;
  url: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  thumbnail?: string;
  duration?: number;
  videoUrl?: string;
  qualityOptions?: VideoQuality[];
}

export interface SearchResult {
  id: string;
  title: string;
  poster: string;
  source: DramaSource;
}

// Raw API response types for DramaBox
interface RawDramaBoxList {
  bookId: string;
  bookName: string;
  coverWap: string;
  cover?: string;
  introduction?: string;
  tags?: string[];
  chapterCount?: number;
  rankVo?: { hotCode: string };
}

interface RawDramaBoxDetail {
  book: {
    bookId: string;
    bookName: string;
    cover: string;
    introduction?: string;
    tags?: string[];
    typeTwoNames?: string[];
    chapterCount?: number;
    viewCount?: number;
  };
  chapterList: RawChapter[];
}

interface RawChapter {
  id: string;
  chapterId?: string;
  index: number;
  chapterIndex?: number;
  name?: string;
  chapterName?: string;
  cover?: string;
  chapterImg?: string;
  duration?: number;
  mp4?: string;
  m3u8Url?: string;
  cdnList?: Array<{
    cdnDomain: string;
    isDefault: number;
    videoPathList: Array<{
      quality: number;
      videoPath: string;
      isDefault: number;
    }>;
  }>;
}

// Raw API response types for Melolo - varies by endpoint
interface RawMeloloBook {
  book_id: string;
  book_name: string;
  thumb_url?: string;
  cover_url?: string;
  abstract?: string;
  serial_count?: number | string;
  read_count?: string;
}

interface RawMeloloEpisode {
  vid_id: string;
  episode_number: number;
  title?: string;
  thumbnail?: string;
  duration?: number;
}

// Raw API response types for NetShort
interface RawNetShortItem {
  shortPlayId: string;
  shortPlayName: string;
  shortPlayCover: string;
  shortPlayLabels?: string;
  labelArray?: string[];
  heatScoreShow?: string;
}

interface RawNetShortEpisode {
  episodeId: string;
  episodeNumber: number;
  episodeCover?: string;
  episodeVideoUrl?: string;
  duration?: number;
}

// Helper to get Melolo image URL
// The CDN serves HEIC which most browsers can't display
// Use wsrv.nl image proxy service to convert to a supported format
function getMeloloImageUrl(url: string): string {
  if (!url) return '';
  // Use wsrv.nl (free image proxy/conversion service) to convert HEIC to JPEG
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&w=300`;
}

// Helper to get NetShort image URL (uses webp which is fine for modern browsers)
function getNetShortImageUrl(url: string): string {
  if (!url) return '';
  return url; // webp is well supported
}

// Transform functions for Melolo - handles different API response formats
function transformMeloloBook(raw: RawMeloloBook): Drama {
  const poster = raw.thumb_url || raw.cover_url || '';
  return {
    id: raw.book_id,
    title: raw.book_name,
    poster: getMeloloImageUrl(poster),
    description: raw.abstract,
    episodes: typeof raw.serial_count === 'string' ? parseInt(raw.serial_count) : raw.serial_count,
    viewCount: raw.read_count ? parseInt(raw.read_count) : undefined,
    source: 'melolo',
  };
}

// Transform functions for DramaBox
function transformDramaBoxList(raw: RawDramaBoxList): Drama {
  return {
    id: raw.bookId,
    title: raw.bookName,
    poster: raw.coverWap || raw.cover,
    description: raw.introduction,
    genre: raw.tags,
    episodes: raw.chapterCount,
    rating: raw.rankVo ? parseFloat(raw.rankVo.hotCode.replace('K', '')) / 10 : undefined,
    source: 'dramabox',
  };
}

function transformDramaBoxDetail(raw: RawDramaBoxDetail): Drama {
  const book = raw.book;
  return {
    id: book.bookId,
    title: book.bookName,
    poster: book.cover,
    description: book.introduction,
    genre: book.typeTwoNames || book.tags,
    episodes: book.chapterCount,
    viewCount: book.viewCount,
    source: 'dramabox',
  };
}

function transformMeloloEpisode(raw: RawMeloloEpisode, index: number): Episode {
  return {
    id: raw.vid_id,
    number: raw.episode_number || index + 1,
    title: raw.title || `Episode ${raw.episode_number || index + 1}`,
    thumbnail: raw.thumbnail,
    duration: raw.duration,
  };
}

// Transform functions for NetShort
function transformNetShortItem(raw: RawNetShortItem): Drama {
  return {
    id: raw.shortPlayId,
    title: raw.shortPlayName,
    poster: getNetShortImageUrl(raw.shortPlayCover),
    genre: raw.labelArray,
    source: 'netshort',
  };
}

// Helper to call the proxy edge function with retry logic
async function callProxy(endpoint: string, params?: string, source: DramaSource = 'dramabox', retries = 3): Promise<any> {
  const queryParams = new URLSearchParams({ endpoint, source });
  if (params) {
    queryParams.set('params', params);
  }

  const url = `${PROXY_BASE}?${queryParams.toString()}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

// Helper to validate drama data - filter out incomplete items
function isValidDrama(drama: Drama): boolean {
  return !!(
    drama.id &&
    drama.title &&
    !drama.title.startsWith('Drama ') &&
    drama.poster &&
    drama.poster.length > 0
  );
}

// Filter valid dramas from array
function filterValidDramas(dramas: Drama[]): Drama[] {
  return dramas.filter(isValidDrama);
}

// ===================== DRAMABOX API =====================

export async function fetchTrending(): Promise<Drama[]> {
  try {
    const data = await callProxy('trending', undefined, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return filterValidDramas(rawList.map(transformDramaBoxList));
  } catch (error) {
    console.error("Error fetching trending:", error);
    return [];
  }
}

export async function fetchLatest(): Promise<Drama[]> {
  try {
    const data = await callProxy('latest', undefined, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return filterValidDramas(rawList.map(transformDramaBoxList));
  } catch (error) {
    console.error("Error fetching latest:", error);
    return [];
  }
}

export async function fetchForYou(): Promise<Drama[]> {
  try {
    const data = await callProxy('foryou', undefined, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return filterValidDramas(rawList.map(transformDramaBoxList));
  } catch (error) {
    console.error("Error fetching for you:", error);
    return [];
  }
}

export async function fetchDubIndo(): Promise<Drama[]> {
  try {
    const data = await callProxy('vip', undefined, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return filterValidDramas(rawList.map(transformDramaBoxList));
  } catch (error) {
    console.error("Error fetching dub indo:", error);
    return [];
  }
}

export async function searchDramaBox(searchQuery: string): Promise<SearchResult[]> {
  try {
    const data = await callProxy('search', `query=${encodeURIComponent(searchQuery)}`, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return rawList.map((raw: any) => ({
      id: raw.bookId,
      title: raw.bookName,
      poster: raw.cover || raw.coverWap,
      source: 'dramabox' as DramaSource,
    }));
  } catch (error) {
    console.error("Error searching DramaBox:", error);
    return [];
  }
}

export async function fetchPopularSearches(): Promise<string[]> {
  try {
    const data = await callProxy('populersearch', undefined, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || [];
    return rawList.map((item: any) => item.bookName || item.keyword || item.name || '').filter(Boolean);
  } catch (error) {
    console.error("Error fetching popular searches:", error);
    return [];
  }
}

export async function fetchDramaBoxDetail(id: string): Promise<Drama | null> {
  try {
    const data = await callProxy('detail', `bookId=${encodeURIComponent(id)}`, 'dramabox');
    const raw = data?.data || data;
    if (!raw || !raw.book) return null;
    return transformDramaBoxDetail(raw);
  } catch (error) {
    console.error("Error fetching DramaBox detail:", error);
    return null;
  }
}

// Helper to extract all quality options from chapter data
function extractQualityOptions(chapter: RawChapter): VideoQuality[] {
  const options: VideoQuality[] = [];
  
  // Check cdnList for video paths with multiple qualities
  if (chapter.cdnList && chapter.cdnList.length > 0) {
    const defaultCdn = chapter.cdnList.find(cdn => cdn.isDefault === 1) || chapter.cdnList[0];
    if (defaultCdn?.videoPathList && defaultCdn.videoPathList.length > 0) {
      for (const video of defaultCdn.videoPathList) {
        if (video.videoPath && video.quality) {
          options.push({
            quality: video.quality,
            url: video.videoPath,
          });
        }
      }
    }
  }
  
  // Sort by quality (highest first)
  options.sort((a, b) => b.quality - a.quality);
  
  return options;
}

// Helper to extract default video URL from chapter data
function extractVideoUrl(chapter: RawChapter): string | undefined {
  // First check cdnList for direct MP4 video paths (preferred for speed control)
  const options = extractQualityOptions(chapter);
  if (options.length > 0) {
    // Prefer 720p, then highest available
    const video720 = options.find(v => v.quality === 720);
    if (video720) return video720.url;
    return options[0].url;
  }
  
  // Fallback to mp4 or m3u8Url
  if (chapter.mp4) return chapter.mp4;
  if (chapter.m3u8Url) return chapter.m3u8Url;
  
  return undefined;
}

export async function fetchDramaBoxEpisodes(id: string): Promise<Episode[]> {
  try {
    // Use allepisode endpoint which includes cdnList with video URLs for all episodes
    const data = await callProxy('allepisode', `bookId=${encodeURIComponent(id)}`, 'dramabox');
    const rawList = Array.isArray(data) ? data : data?.data || data?.chapterList || [];
    
    if (!rawList || rawList.length === 0) {
      // Fallback to detail endpoint
      const detailData = await callProxy('detail', `bookId=${encodeURIComponent(id)}`, 'dramabox');
      const raw = detailData?.data || detailData;
      if (!raw || !raw.chapterList) return [];
      
      return raw.chapterList.map((chapter: RawChapter, index: number) => {
        const qualityOptions = extractQualityOptions(chapter);
        return {
          id: chapter.chapterId || chapter.id || String(index + 1),
          number: (chapter.chapterIndex ?? chapter.index ?? index) + 1,
          title: chapter.chapterName || chapter.name || `Episode ${(chapter.chapterIndex ?? chapter.index ?? index) + 1}`,
          thumbnail: chapter.chapterImg || chapter.cover,
          duration: chapter.duration,
          videoUrl: extractVideoUrl(chapter),
          qualityOptions: qualityOptions.length > 0 ? qualityOptions : undefined,
        };
      });
    }
    
    return rawList.map((chapter: RawChapter, index: number) => {
      const qualityOptions = extractQualityOptions(chapter);
      return {
        id: chapter.chapterId || chapter.id || String(index + 1),
        number: (chapter.chapterIndex ?? chapter.index ?? index) + 1,
        title: chapter.chapterName || chapter.name || `Episode ${(chapter.chapterIndex ?? chapter.index ?? index) + 1}`,
        thumbnail: chapter.chapterImg || chapter.cover,
        duration: chapter.duration,
        videoUrl: extractVideoUrl(chapter),
        qualityOptions: qualityOptions.length > 0 ? qualityOptions : undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching DramaBox episodes:", error);
    return [];
  }
}

// ===================== MELOLO API =====================
// Note: Melolo trending/latest endpoints don't support limit params
// They return a fixed number of items determined by the API

export async function fetchMeloloTrending(): Promise<Drama[]> {
  try {
    const data = await callProxy('trending', undefined, 'melolo');
    // Melolo returns books[] array directly
    const rawList = data?.books || (Array.isArray(data) ? data : data?.data || []);
    return filterValidDramas(rawList.map(transformMeloloBook));
  } catch (error) {
    console.error("Error fetching Melolo trending:", error);
    return [];
  }
}

export async function fetchMeloloLatest(): Promise<Drama[]> {
  try {
    const data = await callProxy('latest', undefined, 'melolo');
    // Melolo returns books[] array directly
    const rawList = data?.books || (Array.isArray(data) ? data : data?.data || []);
    return filterValidDramas(rawList.map(transformMeloloBook));
  } catch (error) {
    console.error("Error fetching Melolo latest:", error);
    return [];
  }
}

export async function searchMelolo(searchQuery: string): Promise<SearchResult[]> {
  try {
    const data = await callProxy('search', `query=${encodeURIComponent(searchQuery)}&limit=20`, 'melolo');
    // Melolo search API returns data in data.search_data[].books[] format
    const searchData = data?.data?.search_data || [];
    const results: SearchResult[] = [];
    
    for (const item of searchData) {
      const books = item?.books || [];
      for (const book of books) {
        results.push({
          id: book.book_id,
          title: book.book_name,
          poster: getMeloloImageUrl(book.thumb_url || book.cover || ''),
          source: 'melolo' as DramaSource,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error searching Melolo:", error);
    return [];
  }
}

export async function fetchMeloloDetail(id: string): Promise<Drama | null> {
  try {
    const data = await callProxy(`detail/${encodeURIComponent(id)}`, undefined, 'melolo');
    const videoData = data?.data?.video_data;
    if (!videoData) return null;
    
    return {
      id: videoData.series_id_str || String(videoData.series_id),
      title: videoData.series_title,
      poster: getMeloloImageUrl(videoData.series_cover || ''),
      description: videoData.series_intro,
      episodes: videoData.episode_cnt,
      viewCount: videoData.series_play_cnt,
      source: 'melolo',
    };
  } catch (error) {
    console.error("Error fetching Melolo detail:", error);
    return null;
  }
}

export async function fetchMeloloEpisodes(id: string): Promise<Episode[]> {
  try {
    const data = await callProxy(`detail/${encodeURIComponent(id)}`, undefined, 'melolo');
    const videoData = data?.data?.video_data;
    if (!videoData || !videoData.video_list) return [];
    
    return videoData.video_list.map((video: any) => ({
      id: video.vid,
      number: video.vid_index,
      title: `Episode ${video.vid_index}`,
      thumbnail: getMeloloImageUrl(video.cover || video.episode_cover || ''),
      duration: video.duration,
    }));
  } catch (error) {
    console.error("Error fetching Melolo episodes:", error);
    return [];
  }
}

export interface MeloloStreamResult {
  url: string;
  qualityOptions: VideoQuality[];
}

// Parse Melolo video_model to extract quality options
function parseMeloloVideoModel(videoModelStr: string): VideoQuality[] {
  try {
    const videoModel = JSON.parse(videoModelStr);
    const videoList = videoModel?.video_list || {};
    const options: VideoQuality[] = [];
    
    // Quality mapping from definition string to number
    const defToQuality: Record<string, number> = {
      '240p': 240,
      '360p': 360,
      '480p': 480,
      '540p': 540,
      '720p': 720,
      '1080p': 1080,
    };
    
    for (const key of Object.keys(videoList)) {
      const video = videoList[key];
      if (video?.main_url && video?.definition) {
        // Decode base64 URL
        try {
          const decodedUrl = atob(video.main_url);
          const quality = defToQuality[video.definition] || parseInt(video.definition) || video.vwidth || 480;
          options.push({ quality, url: decodedUrl });
        } catch {
          // If base64 decode fails, try using as-is
          const quality = defToQuality[video.definition] || parseInt(video.definition) || video.vwidth || 480;
          options.push({ quality, url: video.main_url });
        }
      }
    }
    
    // Sort by quality (highest first)
    options.sort((a, b) => b.quality - a.quality);
    return options;
  } catch (error) {
    console.error("Error parsing Melolo video model:", error);
    return [];
  }
}

export async function fetchMeloloStream(vidId: string): Promise<MeloloStreamResult | null> {
  try {
    const data = await callProxy(`stream/${encodeURIComponent(vidId)}`, undefined, 'melolo');
    
    // Try multiple paths to find the URL
    let mainUrl = data?.data?.main_url || data?.data?.backup_url || null;
    
    // Sometimes the URL is base64 encoded
    if (mainUrl) {
      try {
        // Check if it looks like base64 (no http prefix)
        if (!mainUrl.startsWith('http')) {
          mainUrl = atob(mainUrl);
          
        }
      } catch {
        // Not base64, use as-is
      }
    }
    
    // Try to parse quality options from video_model
    let qualityOptions: VideoQuality[] = [];
    if (data?.data?.video_model) {
      qualityOptions = parseMeloloVideoModel(data.data.video_model);
      
    }
    
    // If we have quality options, use highest quality as default URL
    const url = qualityOptions.length > 0 ? qualityOptions[0].url : mainUrl;
    
    
    
    if (!url) {
      return null;
    }
    
    return { url, qualityOptions };
  } catch (error) {
    console.error("[Melolo] Error fetching stream:", error);
    return null;
  }
}

// ===================== NETSHORT API =====================

export async function fetchNetShortForYou(): Promise<Drama[]> {
  try {
    const data = await callProxy('foryou', undefined, 'netshort');
    const rawList = data?.contentInfos || [];
    return filterValidDramas(rawList.slice(0, 9).map(transformNetShortItem));
  } catch (error) {
    console.error("Error fetching NetShort for you:", error);
    return [];
  }
}

export async function fetchNetShortTheaters(): Promise<Drama[]> {
  try {
    const data = await callProxy('theaters', undefined, 'netshort');
    // theaters returns an array of theater sections
    const allItems: Drama[] = [];
    if (Array.isArray(data)) {
      for (const theater of data) {
        const items = theater?.contentInfos || [];
        allItems.push(...items.map(transformNetShortItem));
      }
    } else if (data?.contentInfos) {
      allItems.push(...data.contentInfos.map(transformNetShortItem));
    }
    return filterValidDramas(allItems.slice(0, 9));
  } catch (error) {
    console.error("Error fetching NetShort theaters:", error);
    return [];
  }
}

export async function searchNetShort(searchQuery: string): Promise<SearchResult[]> {
  try {
    const data = await callProxy('search', `query=${encodeURIComponent(searchQuery)}`, 'netshort');
    const rawList = data?.searchCodeSearchResult || [];
    return rawList.map((raw: any) => ({
      id: raw.shortPlayId,
      title: raw.shortPlayName?.replace(/<em>|<\/em>/g, '') || '',
      poster: getNetShortImageUrl(raw.shortPlayCover || ''),
      source: 'netshort' as DramaSource,
    }));
  } catch (error) {
    console.error("Error searching NetShort:", error);
    return [];
  }
}

export async function fetchNetShortDetail(id: string): Promise<Drama | null> {
  try {
    // NetShort doesn't have a separate detail endpoint, use episodes and extract info
    const data = await callProxy('allepisode', `shortPlayId=${encodeURIComponent(id)}`, 'netshort');
    if (!data || !data.shortPlayName) return null;
    
    return {
      id: data.shortPlayId || id,
      title: data.shortPlayName,
      poster: getNetShortImageUrl(data.shortPlayCover || ''),
      description: data.shotIntroduce,
      episodes: data.episodeCount,
      source: 'netshort',
    };
  } catch (error) {
    console.error("Error fetching NetShort detail:", error);
    return null;
  }
}

// NetShort episode result with subtitles
export interface NetShortEpisodeResult {
  episodes: Episode[];
  subtitlesByEpisode: Map<string, SubtitleTrack[]>;
}

export async function fetchNetShortEpisodes(id: string): Promise<Episode[]> {
  const result = await fetchNetShortEpisodesWithSubtitles(id);
  return result.episodes;
}

export async function fetchNetShortEpisodesWithSubtitles(id: string): Promise<NetShortEpisodeResult> {
  try {
    const data = await callProxy('allepisode', `shortPlayId=${encodeURIComponent(id)}`, 'netshort');
    // NetShort API returns episodes in shortPlayEpisodeInfos array
    const rawList = data?.shortPlayEpisodeInfos || data?.episodeInfoList || [];
    
    const subtitlesByEpisode = new Map<string, SubtitleTrack[]>();
    
    const episodes = rawList.map((ep: any, index: number) => {
      // Video URL is in playVoucher field for NetShort
      const videoUrl = ep.playVoucher || ep.episodeVideoUrl;
      const episodeId = ep.episodeId || String(index + 1);
      
      // Extract subtitles from subtitleList
      if (ep.subtitleList && Array.isArray(ep.subtitleList)) {
        const subs: SubtitleTrack[] = ep.subtitleList.map((sub: any) => ({
          url: sub.url,
          lang: sub.subtitleLanguage || sub.language_id || 'unknown',
          label: getLanguageLabel(sub.subtitleLanguage),
        }));
        subtitlesByEpisode.set(episodeId, subs);
      }
      
      return {
        id: episodeId,
        number: ep.episodeNo || ep.episodeNumber || index + 1,
        title: `Episode ${ep.episodeNo || ep.episodeNumber || index + 1}`,
        thumbnail: getNetShortImageUrl(ep.episodeCover || ''),
        videoUrl: videoUrl,
        duration: ep.duration,
      };
    });
    
    return { episodes, subtitlesByEpisode };
  } catch (error) {
    console.error("Error fetching NetShort episodes:", error);
    return { episodes: [], subtitlesByEpisode: new Map() };
  }
}

// Helper to get language label from language code
function getLanguageLabel(langCode: string): string {
  const labels: Record<string, string> = {
    'en_US': 'English',
    'en-US': 'English',
    'es_MX': 'Spanish',
    'es-MX': 'Spanish',
    'pt_PT': 'Portuguese',
    'pt-PT': 'Portuguese',
    'id_ID': 'Indonesian',
    'id-ID': 'Indonesian',
    'de_DE': 'German',
    'de-DE': 'German',
    'fr_FR': 'French',
    'fr-FR': 'French',
    'ru_RU': 'Russian',
    'ru-RU': 'Russian',
    'it_IT': 'Italian',
    'it-IT': 'Italian',
    'tr_TR': 'Turkish',
    'tr-TR': 'Turkish',
    'ja_JP': 'Japanese',
    'ja-JP': 'Japanese',
    'ko_KR': 'Korean',
    'ko-KR': 'Korean',
    'th_TH': 'Thai',
    'th-TH': 'Thai',
    'vi_VN': 'Vietnamese',
    'vi-VN': 'Vietnamese',
    'tl_PH': 'Filipino',
    'tl-PH': 'Filipino',
    'ms_MY': 'Malay',
    'ms-MY': 'Malay',
    'zh_TW': 'Traditional Chinese',
    'zh-TW': 'Traditional Chinese',
    'hi_IN': 'Hindi',
    'hi-IN': 'Hindi',
  };
  return labels[langCode] || langCode || 'Subtitles';
}

// ===================== DRAPI SOURCES (DramaDash, DramaWave, FreeReels, StarShot) =====================

type DrapiSource = 'dramadash' | 'dramawave' | 'freereels' | 'starshot';

// Raw API response types for DRAPI sources (updated format)
interface RawDrapiItem {
  id: number | string;
  title: string;
  cover?: string;
  poster?: string;
  intro?: string;
  description?: string;
  source?: string;
}

interface RawDrapiEpisode {
  i: number;  // episode number
  n: string;  // episode name/title
}

// Transform DRAPI item to Drama
function transformDrapiItem(raw: RawDrapiItem, source: DrapiSource): Drama {
  return {
    id: String(raw.id),
    title: raw.title,
    poster: raw.cover || raw.poster || '',
    description: raw.intro || raw.description,
    source: source,
  };
}

// Transform DRAPI episode
function transformDrapiEpisode(raw: RawDrapiEpisode): Episode {
  return {
    id: String(raw.i),
    number: raw.i,
    title: raw.n || `Episode ${raw.i}`,
  };
}

// Fetch home/recommendations for DRAPI source
export async function fetchDrapiHome(source: DrapiSource): Promise<Drama[]> {
  try {
    const data = await callProxy('home', undefined, source);
    // New format: { success: true, data: [...] }
    const rawList = data?.data || (Array.isArray(data) ? data : []);
    return filterValidDramas(rawList.map((item: RawDrapiItem) => transformDrapiItem(item, source)));
  } catch (error) {
    console.error(`Error fetching ${source} home:`, error);
    return [];
  }
}

// Search DRAPI source
export async function searchDrapi(searchQuery: string, source: DrapiSource): Promise<SearchResult[]> {
  try {
    const data = await callProxy('search', `q=${encodeURIComponent(searchQuery)}`, source);
    // New format: { success: true, data: [...] }
    const rawList = data?.data || (Array.isArray(data) ? data : []);
    return rawList.map((raw: RawDrapiItem) => ({
      id: String(raw.id),
      title: raw.title,
      poster: raw.cover || raw.poster || '',
      source: source as DramaSource,
    }));
  } catch (error) {
    console.error(`Error searching ${source}:`, error);
    return [];
  }
}

// Cache for DRAPI episodes data to avoid duplicate calls
const drapiEpisodesCache = new Map<string, { data: any; timestamp: number }>();
const DRAPI_CACHE_TTL = 60000; // 1 minute

async function fetchDrapiEpisodesData(id: string, source: DrapiSource): Promise<any> {
  const cacheKey = `${source}:${id}`;
  const cached = drapiEpisodesCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < DRAPI_CACHE_TTL) {
    return cached.data;
  }
  
  const data = await callProxy('episodes', id, source);
  drapiEpisodesCache.set(cacheKey, { data, timestamp: Date.now() });
  
  // Limit cache size
  if (drapiEpisodesCache.size > 50) {
    const oldest = drapiEpisodesCache.keys().next().value;
    if (oldest) drapiEpisodesCache.delete(oldest);
  }
  
  return data;
}

// Fetch drama detail for DRAPI source - uses cached episodes data
export async function fetchDrapiDetail(id: string, source: DrapiSource): Promise<Drama | null> {
  try {
    const data = await fetchDrapiEpisodesData(id, source);
    
    // New format: { success: true, data: [...] } - episodes only, no drama info
    const title = data?.title || data?.name || `Drama ${id}`;
    const poster = data?.cover || data?.poster || data?.image || '';
    const description = data?.intro || data?.description || data?.synopsis || '';
    const episodeCount = data?.data?.length || data?.episodes?.length || 0;
    
    return {
      id: id,
      title: title,
      poster: poster,
      description: description,
      episodes: episodeCount,
      source: source,
    };
  } catch (error) {
    console.error(`Error fetching ${source} detail:`, error);
    return null;
  }
}

// Fetch episodes for DRAPI source - uses cached data
export async function fetchDrapiEpisodes(id: string, source: DrapiSource): Promise<Episode[]> {
  try {
    const data = await fetchDrapiEpisodesData(id, source);
    // New format: { success: true, data: [{i: 1, n: "1"}, ...] }
    const rawList = data?.data || (Array.isArray(data) ? data : []);
    return rawList.map((ep: RawDrapiEpisode) => transformDrapiEpisode(ep));
  } catch (error) {
    console.error(`Error fetching ${source} episodes:`, error);
    return [];
  }
}

// Subtitle track type
export interface SubtitleTrack {
  url: string;
  lang: string;
  label: string;
}

// Stream result with subtitles
export interface DrapiStreamResult {
  url: string | null;
  subtitles: SubtitleTrack[];
}

// Fetch stream URL and subtitles for DRAPI source
export async function fetchDrapiStream(dramaId: string, episodeNumber: number, source: DrapiSource): Promise<DrapiStreamResult> {
  try {
    const data = await callProxy('watch', `${dramaId}/${episodeNumber}`, source);
    // New format: { success: true, url: "/api/v1/proxy?url=..." }
    let url = data?.url || null;
    
    // Handle different proxy URL formats - use the full DRAPI proxy URL for m3u8 streams
    if (url) {
      if (url.startsWith('/api/v1/proxy?url=') || url.startsWith('/api/proxy?url=')) {
        // Use the DRAPI proxy URL directly for m3u8 streams (CORS/auth issues otherwise)
        url = `https://drapi.finnsyde.lol${url}`;
      }
    }
    
    // Extract subtitles from response
    const subtitles: SubtitleTrack[] = (data?.subtitles || []).map((sub: any) => ({
      url: sub.url,
      lang: sub.lang || 'unknown',
      label: sub.label || 'Subtitles',
    }));
    
    return { url, subtitles };
  } catch (error) {
    console.error(`Error fetching ${source} stream:`, error);
    return { url: null, subtitles: [] };
  }
}

// Convenience functions for each source
export const fetchDramaDashHome = () => fetchDrapiHome('dramadash');
export const fetchDramaWaveHome = () => fetchDrapiHome('dramawave');
export const fetchFreeReelsHome = () => fetchDrapiHome('freereels');
export const fetchStarShotHome = () => fetchDrapiHome('starshot');

export const searchDramaDash = (q: string) => searchDrapi(q, 'dramadash');
export const searchDramaWave = (q: string) => searchDrapi(q, 'dramawave');
export const searchFreeReels = (q: string) => searchDrapi(q, 'freereels');
export const searchStarShot = (q: string) => searchDrapi(q, 'starshot');

// ===================== COMBINED FUNCTIONS =====================

// Check if source is a DRAPI source
function isDrapiSource(source: DramaSource): source is DrapiSource {
  return ['dramadash', 'dramawave', 'freereels', 'starshot'].includes(source);
}

// Search all sources (incl. WebDracin Sub Indo via same-deploy /api/*)
export async function searchDramas(searchQuery: string): Promise<SearchResult[]> {
  try {
    const [
      dramaboxResults,
      meloloResults,
      netshortResults,
      dramadashResults,
      dramawaveResults,
      freereelsResults,
      starshotResults,
      webdracinResults,
    ] = await Promise.allSettled([
      searchDramaBox(searchQuery),
      searchMelolo(searchQuery),
      searchNetShort(searchQuery),
      searchDramaDash(searchQuery),
      searchDramaWave(searchQuery),
      searchFreeReels(searchQuery),
      searchStarShot(searchQuery),
      fetchWdSearch(searchQuery).then(wdSearchResults),
    ]);
    
    const results: SearchResult[] = [];
    
    if (dramaboxResults.status === 'fulfilled') {
      results.push(...dramaboxResults.value);
    }
    
    if (meloloResults.status === 'fulfilled') {
      results.push(...meloloResults.value);
    }
    
    if (netshortResults.status === 'fulfilled') {
      results.push(...netshortResults.value);
    }
    
    if (dramadashResults.status === 'fulfilled') {
      results.push(...dramadashResults.value);
    }
    
    if (dramawaveResults.status === 'fulfilled') {
      results.push(...dramawaveResults.value);
    }
    
    if (freereelsResults.status === 'fulfilled') {
      results.push(...freereelsResults.value);
    }
    
    if (starshotResults.status === 'fulfilled') {
      results.push(...starshotResults.value);
    }

    if (webdracinResults.status === 'fulfilled') {
      results.push(...webdracinResults.value);
    }
    
    return results;
  } catch (error) {
    console.error("Error searching:", error);
    return [];
  }
}

// Fetch drama detail from appropriate source
export async function fetchDramaDetail(id: string, source: DramaSource = 'dramabox'): Promise<Drama | null> {
  if (source === 'webdracin') {
    try {
      return wdToDramaDetail(await fetchWdWatch(id));
    } catch (error) {
      console.error("Error fetching WebDracin detail:", error);
      return null;
    }
  }
  if (source === 'melolo') {
    return fetchMeloloDetail(id);
  }
  if (source === 'netshort') {
    return fetchNetShortDetail(id);
  }
  if (isDrapiSource(source)) {
    return fetchDrapiDetail(id, source);
  }
  return fetchDramaBoxDetail(id);
}

// Fetch episodes from appropriate source
export async function fetchEpisodes(id: string, source: DramaSource = 'dramabox'): Promise<Episode[]> {
  if (source === 'webdracin') {
    try {
      return wdEpisodes(await fetchWdWatch(id));
    } catch (error) {
      console.error("Error fetching WebDracin episodes:", error);
      return [];
    }
  }
  if (source === 'melolo') {
    return fetchMeloloEpisodes(id);
  }
  if (source === 'netshort') {
    return fetchNetShortEpisodes(id);
  }
  if (isDrapiSource(source)) {
    return fetchDrapiEpisodes(id, source);
  }
  return fetchDramaBoxEpisodes(id);
}

// Fetch stream data (for sources that need separate stream call)
export async function fetchStreamUrl(episodeId: string, source: DramaSource, dramaId?: string, episodeNumber?: number): Promise<string | null> {
  if (source === 'melolo') {
    const result = await fetchMeloloStream(episodeId);
    return result?.url || null;
  }
  if (isDrapiSource(source) && dramaId && episodeNumber) {
    const result = await fetchDrapiStream(dramaId, episodeNumber, source);
    return result.url;
  }
  // DramaBox and NetShort include videoUrl in episode data, no separate call needed
  return null;
}

// Fetch stream with quality options (for Melolo)
export async function fetchStreamWithQuality(episodeId: string, source: DramaSource): Promise<MeloloStreamResult | null> {
  if (source === 'melolo') {
    return fetchMeloloStream(episodeId);
  }
  return null;
}

// WebDracin stream: signed per-episode URL + Indo subtitles via /api/episode.
export async function fetchWebdracinStream(
  dramaId: string,
  episodeNumber: number,
  eid: string
): Promise<{ url: string | null; subtitles: SubtitleTrack[] }> {
  try {
    const data = await fetchWdEpisode(dramaId, episodeNumber, eid);
    return { url: data.videoUrl || null, subtitles: wdSubtitleTracks(data.subtitles) };
  } catch (error) {
    console.error("Error fetching WebDracin stream:", error);
    return { url: null, subtitles: [] };
  }
}
