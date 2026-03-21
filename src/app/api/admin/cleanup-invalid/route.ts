import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";

export async function GET(request: Request) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = envEmails ? envEmails.split(",").map(e => e.trim()) : [];

    if (!user || !user.email || !adminEmails.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized. Must be Admin." }, { status: 403 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data: videos, error } = await adminClient.from('videos').select('youtube_id');
    if (error || !videos) return NextResponse.json({ error: 'Failed to fetch videos' });

    const videoIds = videos.map(v => v.youtube_id);
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) chunks.push(videoIds.slice(i, i + 50));

    let deletedCount = 0;
    const deletedIds = [];
    const debug: any = {
      dbVidsCount: videos.length,
      chunksCount: chunks.length,
      ytErrors: []
    };

    for (const chunk of chunks) {
      const idsParam = chunk.join(',');
      const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${idsParam}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        debug.ytErrors.push(data.error);
        continue;
      }
      if (!data.items) continue;

      // 1. Delete videos where embedding is disabled
      for (const item of data.items) {
        if (item.status && item.status.embeddable === false) {
          await adminClient.from('bookmarks').delete().eq('video_id', item.id);
          const { error: delError } = await adminClient.from('videos').delete().eq('youtube_id', item.id);
          if (!delError) {
            deletedCount++;
            deletedIds.push(item.id + " (Embedding disabled)");
          } else {
            console.error("Delete error:", delError);
          }
        }
      }

      // 2. Delete videos that vanished from YouTube (deleted/private)
      const returnedIds = new Set(data.items.map((item: any) => item.id));
      for (const id of chunk) {
        if (!returnedIds.has(id)) {
          await adminClient.from('bookmarks').delete().eq('video_id', id);
          const { error: delError } = await adminClient.from('videos').delete().eq('youtube_id', id);
          if (!delError) {
            deletedCount++;
            deletedIds.push(id + " (Deleted or Private from YT)");
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `청소 완료! 총 ${deletedCount}개의 재생 불가 영상을 삭제했습니다.`,
      debug,
      deletedIds 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
