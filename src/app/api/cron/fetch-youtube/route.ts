import { NextResponse } from "next/server";
import { fetchAIVideos } from "@/lib/youtube";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60; // Max duration for Vercel Cron

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  
/* 
  const secret = process.env.CRON_SECRET;
  const isAuthorized = !secret || 
                       authHeader === `Bearer ${secret}` || 
                       keyParam === secret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  */

  try {
    console.log("Starting YouTube sync cron job...");
    
    // Fetch combined keyword videos
    const searchQuery = "AI film|AI movie|AI generated drama|AI webdrama|AI cinematic|AI short film|AI documentary|#AIFilm|#AI시네마";
    const rawVideos = await fetchAIVideos(searchQuery, 40);
    
    // Categorize
    const allVideos = [];
    for (const v of rawVideos) {
      const getDurationSecs = (durStr: string) => {
        const parts = durStr.split(":").map(Number);
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        return parts[0]*60 + parts[1];
      };
      const durationSec = getDurationSecs(v.duration);
      
      const titleLower = v.title.toLowerCase();
      const descLower = v.description.toLowerCase();
      const fullText = (titleLower + " " + descLower);

      // Discard Trash (Reject Patterns)
      const rejectPatterns = ["how to", "tutorial", "making of", "behind the scenes", "news", "review", "reaction", "vs", "scam", "course", "step by step"];
      const isTrash = rejectPatterns.some(p => fullText.includes(p));
      if (isTrash) continue; // Skip to next video

      // Categories
      let category = null;

      // Movies criteria: >= 10m OR title/desc has movie keywords
      const movieKeywords = ["#ai시네마", "full movie", "시네마틱", "short film", "trailer", "concept", "단편"];
      const isMovieKeyword = movieKeywords.some(kw => fullText.includes(kw));
      
      // Dramas criteria: title has drama keywords
      const dramaKeywords = ["ep.01", "episode", "ep.", "웹드라마", "시리즈", "season", "#ai드라마"];
      const isDramaKeyword = dramaKeywords.some(kw => titleLower.includes(kw) || fullText.includes(kw));

      if (durationSec >= 600 || isMovieKeyword) {
        category = "Movie";
      } else if (durationSec < 600 && isDramaKeyword) {
        category = "Drama";
      } else {
        // Fallback for valid lengths that didn't match keywords (mostly normal movies)
        category = durationSec >= 180 ? "Movie" : "Drama"; 
      }

      // Language Inference
      let language = "영어"; // default
      if (fullText.includes("no dialogue") || fullText.includes("silent") || fullText.includes("bgm") || fullText.includes("music only")) {
        language = "No Dialogue";
      } else if (/[가-힣]/.test(fullText)) {
        language = "한국어";
      } else if (/[ぁ-んァ-ン]/.test(fullText)) {
        language = "일본어";
      } else if (/[一-龥]/.test(fullText)) {
        language = "중국어";
      } else if (/[\u0900-\u097F]/.test(fullText) || fullText.includes("hindi")) {
        language = "힌디어";
      } else if (/\b(el|la|los|las|un|una|es|en|para|con|spanish)\b/.test(fullText)) {
        language = "스페인어";
      } else if (/\b(o|a|os|as|um|uma|é|em|para|com|portuguese)\b/.test(fullText)) {
        language = "포르투갈어";
      } else if (/\b(le|la|les|un|une|est|et|en|pour|dans|french)\b/.test(fullText)) {
        language = "프랑스어";
      }

      allVideos.push({ ...v, category, language });
    }

    let upsertedCount = 0;
    let firstError = null;

    for (const video of allVideos) {
      const textForTags = (video.title + " " + video.description).toLowerCase();
      const tools = [];
      if (textForTags.includes("veo")) tools.push("Veo");
      if (textForTags.includes("pika")) tools.push("Pika");
      if (textForTags.includes("seedream")) tools.push("Seedream");
      if (textForTags.includes("flux")) tools.push("FLUX");
      if (textForTags.includes("midjourney")) tools.push("Midjourney");
      
      const viewCountInt = parseInt(video.views.replace(/\D/g, "")) || 0;

      const { error: upsertError } = await supabase
        .from("videos")
        .upsert({
          youtube_id: video.id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail,
          duration: video.duration,
          view_count: viewCountInt,
          category: video.category,
          published_at: video.uploadedAt,
          ai_tool_tags: tools,
          channel_title: video.channelTitle,
          language: video.language,
        }, { onConflict: "youtube_id" });

      if (upsertError) {
        console.error(`Error upserting video ${video.id}:`, upsertError);
        if (!firstError) firstError = upsertError;
      } else {
        upsertedCount++;
      }
    }

    const moviesFound = allVideos.filter(v => v.category === "Movie").length;
    const dramasFound = allVideos.filter(v => v.category === "Drama").length;

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${upsertedCount} videos.`,
      debug: {
        moviesFound,
        dramasFound,
        totalAttempted: allVideos.length,
        supabaseError: firstError
      }
    });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
