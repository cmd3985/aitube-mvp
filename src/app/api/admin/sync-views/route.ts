import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60; // Max execution time for Vercel

export async function GET() {
  console.log("Starting DB view_count repair sync...");
  try {
    const { data: videos, error } = await supabase.from('videos').select('youtube_id');
    if (error || !videos) {
      return NextResponse.json({ error: "Failed to fetch videos from Supabase" }, { status: 500 });
    }

    const ids = videos.map(v => v.youtube_id);
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });
    }

    let updated = 0;

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}&key=${API_KEY}`;
      const res = await fetch(url);
      const ytData = await res.json();

      if (!ytData.items) continue;

      for (const item of ytData.items) {
        const rawViewCount = parseInt(item.statistics.viewCount || "0", 10) || 0;
        const likeCount = parseInt(item.statistics.likeCount || "0", 10) || 0;
        const commentCount = parseInt(item.statistics.commentCount || "0", 10) || 0;
        const engagementScore = rawViewCount + (likeCount * 20) + (commentCount * 50);

        const { error: updateError } = await supabase
          .from('videos')
          .update({
            view_count: rawViewCount,
            like_count: likeCount,
            comment_count: commentCount,
            engagement_score: engagementScore
          })
          .eq('youtube_id', item.id);

        if (!updateError) updated++;
      }
    }

    return NextResponse.json({ success: true, message: `Successfully repaired stats for ${updated} videos!` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
