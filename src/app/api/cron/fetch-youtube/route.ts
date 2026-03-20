import { NextResponse } from "next/server";
import { fetchAIVideos } from "@/lib/youtube";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60; // Max duration for Vercel Cron

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  
  const secret = process.env.CRON_SECRET;
  const isAuthorized = !secret || 
                       authHeader === `Bearer ${secret}` || 
                       keyParam === secret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting YouTube sync cron job...");
    
    // Fetch Movies
    const movies = await fetchAIVideos("AI movie film cinematic -shorts", 20);
    // Fetch Dramas
    const dramas = await fetchAIVideos("AI drama series episode -shorts", 20);
    
    const allVideos = [
      ...movies.map(v => ({ ...v, category: "Movie" })),
      ...dramas.map(v => ({ ...v, category: "Drama" }))
    ];

    let upsertedCount = 0;

    for (const video of allVideos) {
      const textForTags = (video.title + " " + video.description).toLowerCase();
      const tools = [];
      if (textForTags.includes("veo")) tools.push("Veo");
      if (textForTags.includes("pika")) tools.push("Pika");
      if (textForTags.includes("seedream")) tools.push("Seedream");
      if (textForTags.includes("flux")) tools.push("FLUX");
      if (textForTags.includes("midjourney")) tools.push("Midjourney");
      
      const viewCountInt = parseInt(video.views.replace(/\D/g, "")) || 0;

      const { error } = await supabase
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
        }, { onConflict: "youtube_id" });

      if (error) {
        console.error(`Error upserting video ${video.id}:`, error);
      } else {
        upsertedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${upsertedCount} videos successfully.`,
      debug: {
        moviesFound: movies.length,
        dramasFound: dramas.length,
        totalAttempted: allVideos.length
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
