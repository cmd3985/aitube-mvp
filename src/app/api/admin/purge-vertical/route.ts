import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const API_KEY = process.env.YOUTUBE_API_KEY || "";

export async function GET() {
  // 1. Get all video youtube_ids from DB
  const { data: videos, error } = await supabase
    .from('videos')
    .select('youtube_id');

  if (error || !videos) {
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }

  const allIds = videos.map(v => v.youtube_id);
  const verticalIds: string[] = [];

  // 2. Check in batches of 50
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=player&id=${batch.join(",")}&key=${API_KEY}`
    );
    if (!res.ok) continue;
    const data = await res.json();
    for (const item of (data.items || [])) {
      const w = parseInt(item.player?.embedWidth || "1280", 10);
      const h = parseInt(item.player?.embedHeight || "720", 10);
      if (h > w) {
        verticalIds.push(item.id);
      }
    }
  }

  if (verticalIds.length === 0) {
    return NextResponse.json({ message: "No vertical videos found.", deleted: 0 });
  }

  // 3. Delete vertical videos
  const { error: delError } = await supabase
    .from('videos')
    .delete()
    .in('youtube_id', verticalIds);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ 
    message: `Deleted ${verticalIds.length} vertical (9:16) videos`,
    deleted: verticalIds.length,
    ids: verticalIds
  });
}
