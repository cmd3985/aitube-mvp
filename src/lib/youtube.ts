import "server-only";

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
  channelTitle: string;
}

const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

// Parse ISO 8601 duration (e.g. PT1H2M10S -> 01:02:10 or 02:10)
function parseDuration(pt: string) {
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "00:00";
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  
  const totalSeconds = h * 3600 + m * 60 + s;
  
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Convert ISO 8601 to total seconds
function getDurationSeconds(pt: string) {
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseInt(match[3] || "0");
}

function formatViews(viewCount: string) {
  const num = parseInt(viewCount);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M views";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K views";
  return num + " views";
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export async function fetchAIVideos(query: string = "AI short film", maxResults: number = 30): Promise<YouTubeVideoInfo[]> {
  try {
    // 1. Search for videos via /search
    const searchRes = await fetch(
      `${BASE_URL}/search?part=id&q=${encodeURIComponent(query)}&type=video&videoDefinition=high&maxResults=${maxResults}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) throw new Error("Failed to fetch search results");
    const searchData = await searchRes.json();
    
    if (!searchData.items || searchData.items.length === 0) return [];
    
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",");
    
    // 2. Fetch video details via /videos to get duration, stats, high-res snippet
    const videoRes = await fetch(
      `${BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!videoRes.ok) throw new Error("Failed to fetch video details");
    const videoData = await videoRes.json();

    if (!videoData.items) return [];

    return videoData.items
      .filter((item: any) => {
        const snippet = item.snippet;
        const durationSec = getDurationSeconds(item.contentDetails.duration);
        const title = snippet.title.toLowerCase();
        const desc = snippet.description.toLowerCase();
        
        // Quality Control: >= 60 seconds, no #shorts in title/desc
        const isShort = title.includes("#shorts") || desc.includes("#shorts") || durationSec < 60;
        return !isShort;
      })
      .map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        duration: parseDuration(item.contentDetails.duration),
        views: formatViews(item.statistics.viewCount || "0"),
        uploadedAt: timeAgo(item.snippet.publishedAt),
        channelTitle: item.snippet.channelTitle
      }));
  } catch (error) {
    console.error("YouTube API Error:", error);
    return [];
  }
}
