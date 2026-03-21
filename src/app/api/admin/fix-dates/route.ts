import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin only route to fix the legacy timeAgo strings into proper ISO-8601 strings
export const maxDuration = 60; // Max duration for Vercel

export async function GET(req: Request) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
    if (!YOUTUBE_API_KEY) throw new Error("Missing YouTube API Key");

    // Get all videos that don't have an ISO string (ISO strings always contain 'T')
    const { data: videos, error } = await adminClient
      .from('videos')
      .select('youtube_id')
      .not('published_at', 'ilike', '%T%');

    if (error || !videos) return NextResponse.json({ error: 'Failed to fetch videos' });

    // Split into chunks of 50
    const chunks = [];
    for (let i = 0; i < videos.length; i += 50) {
      chunks.push(videos.slice(i, i + 50).map(v => v.youtube_id));
    }

    let updatedCount = 0;
    const errors = [];

    for (const chunk of chunks) {
      const idsParam = chunk.join(',');
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${idsParam}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url, { headers: { 'Referer': 'https://gencine.org/' } });
      const data = await res.json();

      if (data.error) {
        errors.push(data.error);
        continue;
      }
      if (!data.items) continue;

      for (const item of data.items) {
        if (item.snippet && item.snippet.publishedAt) {
          const { error: updateError } = await adminClient
            .from('videos')
            .update({ published_at: item.snippet.publishedAt })
            .eq('youtube_id', item.id);
            
          if (!updateError) {
            updatedCount++;
          } else {
            errors.push(updateError);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `마이그레이션 완료! 총 ${updatedCount}개의 영상 날짜 포맷을 ISO-8601로 수정했습니다.`,
      debug: {
        targetCount: videos.length,
        errors
      }
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
