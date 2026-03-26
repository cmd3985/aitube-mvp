import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";
const BATCH_SIZE = 50; // YouTube API max per request

// Re-validates all published videos against YouTube API and removes age-restricted or non-embeddable ones
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch all youtube_ids from DB
    const { data: allVideos, error } = await supabase
      .from("videos")
      .select("youtube_id")
      .eq("status", "published");

    if (error) throw error;
    if (!allVideos || allVideos.length === 0) {
      return NextResponse.json({ success: true, deleted_count: 0, message: "No videos to check." });
    }

    const ids = allVideos.map((v: any) => v.youtube_id);
    const toDelete: string[] = [];

    // Process in batches of 50
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE).join(",");
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${batch}&key=${YOUTUBE_API_KEY}`,
        { headers: { 'Referer': 'https://gencine.org/' } }
      );
      if (!res.ok) continue;
      const data = await res.json();

      // Build a set of valid IDs from this batch
      const validIds = new Set<string>();
      for (const item of (data.items || [])) {
        const isAgeRestricted = item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted';
        const isEmbeddable = item.status?.embeddable !== false;
        if (!isAgeRestricted && isEmbeddable) {
          validIds.add(item.id);
        }
      }

      // Any ID in the batch that YouTube returned as invalid (deleted/private) OR age-restricted
      for (const id of batch.split(",")) {
        const returnedByYT = (data.items || []).some((item: any) => item.id === id);
        if (!returnedByYT || !validIds.has(id)) {
          toDelete.push(id);
        }
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ success: true, deleted_count: 0, message: "All videos passed validation!" });
    }

    // Delete in batches
    let deletedCount = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error: delError } = await supabase
        .from("videos")
        .delete()
        .in("youtube_id", batch);
      if (!delError) deletedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      checked: ids.length,
      deleted_count: deletedCount,
      deleted_ids: toDelete,
      message: `Removed ${deletedCount} age-restricted/private/deleted videos.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
