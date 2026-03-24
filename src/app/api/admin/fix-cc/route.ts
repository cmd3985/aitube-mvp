import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300; // Allow 5 minutes for processing thousands of videos

export async function GET(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });
    
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");
    const secret = process.env.CRON_SECRET;
    
    // Allow local testing without a key, but require it in production if set
    if (secret && keyParam !== secret && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting CC License backfill...");

    // Fetch all videos from DB
    const { data: videos, error } = await adminClient.from('videos').select('id, youtube_id');
    if (error) throw error;
    if (!videos || videos.length === 0) return NextResponse.json({ success: true, message: "No videos to process." });

    console.log(`Found ${videos.length} videos to verify for Creative Commons licenses.`);

    // Batch into chunks of 50 for the YouTube API
    const CHUNK_SIZE = 50;
    let totalUpdated = 0;
    let totalProcessed = 0;

    for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
      const chunk = videos.slice(i, i + CHUNK_SIZE);
      const youtubeIds = chunk.map(v => v.youtube_id).filter(id => id).join(",");
      
      try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status&id=${youtubeIds}&key=${YOUTUBE_API_KEY}`, {
          headers: { 'Referer': 'https://gencine.org/' }
        });
        
        if (!ytRes.ok) {
          console.error(`YouTube API failed for chunk at index ${i}`);
          continue;
        }

        const ytData = await ytRes.json();
        
        if (!ytData.items) continue;

        for (const item of ytData.items) {
          const is_cc = item.status?.license === 'creativeCommon';
          
          if (is_cc) {
            // Update the DB for CC videos
            const { error: updateError } = await adminClient
              .from('videos')
              .update({ is_cc: true })
              .eq('youtube_id', item.id);
              
            if (updateError) {
              console.error(`[DB Error] Failed to update CC status for ${item.id}:`, updateError);
            } else {
              totalUpdated++;
            }
          }
        }
        
        totalProcessed += chunk.length;
        console.log(`Processed ${totalProcessed}/${videos.length} videos. Found ${totalUpdated} CC licenses so far.`);
      } catch (e: any) {
        console.error(`Chunk error at index ${i}:`, e?.message);
      }
    }

    console.log(`CC Backfill Complete. Total updated to is_cc = true: ${totalUpdated}`);

    return NextResponse.json({ 
      success: true, 
      processed: totalProcessed,
      cc_videos_found: totalUpdated,
      message: `Successfully verified licenses and updated ${totalUpdated} videos as Creative Commons.`
    });

  } catch (err: any) {
    console.error("CC Backfill Root Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
