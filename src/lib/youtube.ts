import "server-only";
import sharp from "sharp";

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  rawViewCount: number;
  likeCount: number;
  commentCount: number;
  uploadedAt: string;
  channelTitle: string;
}

const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

// Parse ISO 8601 duration (e.g. PT1H2M10S -> 01:02:10 or 02:10)
export function parseDuration(pt: string) {
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

export async function fetchAIVideos(query: string = "AI short film", maxResults: number = 50, relevanceLanguage: string = "en", order: "relevance" | "date" | "viewCount" | "rating" = "relevance", regionCode: string = "US"): Promise<YouTubeVideoInfo[]> {
  try {
    // 1. Search for videos via /search (videoCategoryId=1 is Film & Animation)
    // Wrap the query in quotes to strictly match the terms (avoids "Ladaai" matching "AI")
    const exactQuery = `"${query}" -tutorial -how -review -news -podcast -react -scam -vs`;
    const publishedAfter = "2023-01-01T00:00:00Z"; // Enforce AI era cutoff
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        exactQuery
      )}&publishedAfter=${encodeURIComponent(publishedAfter)}&maxResults=${maxResults}&order=${order}&type=video&videoCategoryId=1&relevanceLanguage=${relevanceLanguage}&regionCode=${regionCode}&key=${API_KEY}`,
      { headers: { 'Referer': 'https://gencine.org/' } }
    );

    if (!searchRes.ok) {
      const errData = await searchRes.json();
      console.error("YouTube API Search Error:", errData);
      throw new Error(`YouTube API Search failed: ${JSON.stringify(errData.error?.message || "Unknown error")}`);
    }
    const searchData = await searchRes.json();
    
    if (!searchData.items || searchData.items.length === 0) return [];
    
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",");
    
    // 2. Fetch video details via /videos to get duration, stats, high-res snippet
    // Include player part to detect vertical (9:16) videos
    const detailsRes = await fetch(
      `${BASE_URL}/videos?part=snippet,contentDetails,statistics,player,status&id=${videoIds}&key=${API_KEY}`,
      { next: { revalidate: 3600 }, headers: { 'Referer': 'https://gencine.org/' } }
    );
    if (!detailsRes.ok) throw new Error("Failed to fetch video details");
    const videoData = await detailsRes.json();

    if (!videoData.items) return [];

    // Async filter: quality + pillarbox detection
    const results = await Promise.all(
      videoData.items.map(async (item: any) => {
        const snippet = item.snippet;
        const durationSec = getDurationSeconds(item.contentDetails.duration);
        const title = snippet.title.toLowerCase();
        const desc = snippet.description.toLowerCase();

        // Quality Control: >= 120 seconds (2 minutes), no #shorts
        const isShort = title.includes("#shorts") || desc.includes("#shorts") || durationSec < 120;
        if (isShort) return null;
        
        // Ensure video is embeddable
        if (item.status && item.status.embeddable === false) return null;

        // Detect vertical (9:16) via player embed dimensions (catches pure vertical uploads)
        const playerWidth = parseInt(item.player?.embedWidth || "1280", 10);
        const playerHeight = parseInt(item.player?.embedHeight || "720", 10);
        if (playerHeight > playerWidth) return null;

        // Detect pillarboxed vertical content via thumbnail edge pixel analysis
        const thumbUrl = snippet.thumbnails.high?.url || snippet.thumbnails.default?.url;
        if (thumbUrl) {
          try {
            const thumbRes = await fetch(thumbUrl);
            const buffer = Buffer.from(await thumbRes.arrayBuffer());
            const { data, info } = await sharp(buffer).resize(160, 90).raw().toBuffer({ resolveWithObject: true });
            const { width, height, channels } = info;
            const edgeWidth = Math.floor(width * 0.12); // check leftmost/rightmost 12%
            let darkPixels = 0;
            let totalEdgePixels = 0;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < edgeWidth; x++) {
                const idx = (y * width + x) * channels;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness < 30) darkPixels++;
                totalEdgePixels++;
              }
              for (let x = width - edgeWidth; x < width; x++) {
                const idx = (y * width + x) * channels;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (brightness < 30) darkPixels++;
                totalEdgePixels++;
              }
            }
            if (darkPixels / totalEdgePixels > 0.8) {
              console.log(`[Pillarbox] Rejected vertical content: "${snippet.title}" (darkRatio=${(darkPixels / totalEdgePixels).toFixed(2)})`);
              return null; // Reject 9:16 videos padded with black bars
            }
            
            // AI Vision Check: Detect blurred sidebars padding 
            if (process.env.OPENAI_API_KEY) {
              const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [
                    {
                      role: "user",
                      content: [
                        { type: "text", text: "Is this image a vertical video (9:16 or portrait) that has been padded with blurred or duplicate sidebars to fit a horizontal (16:9) frame? This is common for YouTube Shorts uploaded as regular videos. Reply exactly with only 'true' or 'false'." },
                        { type: "image_url", image_url: { url: thumbUrl } }
                      ]
                    }
                  ],
                  max_tokens: 10
                })
              });
              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const answer = aiData.choices?.[0]?.message?.content?.trim()?.toLowerCase() || "false";
                if (answer.includes("true")) {
                  console.log(`[AI Vision] Rejected blurred pillarbox content: "${snippet.title}"`);
                  return null; // Reject blurred pillarbox
                }
              } else {
                console.error("OpenAI API call failed:", aiRes.status, await aiRes.text());
              }
            }
          } catch (e) {
            console.error("Thumbnail analysis error:", e);
            // If thumbnail analysis fails, allow the video through
          }
        }

        return {
          id: item.id,
          title: snippet.title,
          description: snippet.description,
          thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
          duration: parseDuration(item.contentDetails.duration),
          views: formatViews(item.statistics.viewCount || "0"),
          rawViewCount: parseInt(item.statistics.viewCount || "0", 10) || 0,
          likeCount: parseInt(item.statistics.likeCount || "0", 10) || 0,
          commentCount: parseInt(item.statistics.commentCount || "0", 10) || 0,
          uploadedAt: item.snippet.publishedAt, // Raw ISO-8601 for accurate DB sorting
          channelTitle: item.snippet.channelTitle
        };
      })
    );

    return results.filter(Boolean) as YouTubeVideoInfo[];
  } catch (error) {
    console.error("YouTube API Error:", error);
    return [];
  }
}
