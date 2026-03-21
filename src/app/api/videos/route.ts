import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 24;
  const sort = searchParams.get('sort') || 'popular';
  const duration = searchParams.get('duration') || 'All';
  const language = searchParams.get('language') || 'All';

  let query = supabase.from('videos').select('*');

  // 1. Language Filter
  if (language !== 'All' && language) {
    query = query.eq('language', language);
  }

  // 2. Duration Filter (Schema-less Pattern Matching)
  if (duration !== 'All') {
    if (duration === 'Under 5m') {
      // Matches 0:00 - 4:59 (e.g. 4:20, 04:12)
      query = query.or('duration.like.0:__,duration.like.1:__,duration.like.2:__,duration.like.3:__,duration.like.4:__,duration.like.00:__,duration.like.01:__,duration.like.02:__,duration.like.03:__,duration.like.04:__');
    } else if (duration === '5m - 10m') {
      // Matches 5:00 - 9:59 (e.g. 5:20, 09:12)
      query = query.or('duration.like.5:__,duration.like.6:__,duration.like.7:__,duration.like.8:__,duration.like.9:__,duration.like.05:__,duration.like.06:__,duration.like.07:__,duration.like.08:__,duration.like.09:__');
    } else if (duration === '10m - 20m') {
      // Matches 10:00 - 19:59
      query = query.like('duration', '1_:__');
    } else if (duration === '20m+' || duration === '20m ') {
      // Matches 20:00+, 30:00+, 40:00+, 50:00+, and anything over 1 hour (HH:MM:SS format)
      query = query.or('duration.like.2_:__,duration.like.3_:__,duration.like.4_:__,duration.like.5_:__,duration.like.%:%:%');
    }
  }

  // 3. Sorting
  if (sort === 'popular') {
    query = query.order('engagement_score', { ascending: false });
  } else if (sort === 'latest') {
    query = query.order('published_at', { ascending: false });
  } else if (sort === 'trending') {
    // Trending approximation: high views + recent. 
    // Fallback to views for MVP without custom RPC
    query = query.order('view_count', { ascending: false });
  } else if (sort === 'runtime') {
    // String sorting works decently well if no 1h+ exists, 
    // but we add it as an option. (It will sort 59:00 above 1:00:00, MVP limitation accepted)
    query = query.order('duration', { ascending: false });
  }

  // 4. Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("API Videos Query Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M views";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K views";
    return num + " views";
  };

  // Format the output
  const payload = (data || []).map(v => ({
    id: v.youtube_id,
    title: v.title,
    description: v.description || "",
    thumbnail: v.thumbnail_url,
    duration: v.duration,
    views: formatViews(v.view_count),
    uploadedAt: v.published_at, 
    rawDate: v.published_at,
    channelTitle: v.channel_title || "Unknown Channel",
    category: v.category,
    ai_tool_tags: Array.isArray(v.ai_tool_tags) ? v.ai_tool_tags.join(",") : v.ai_tool_tags,
    language: !v.language || v.language === "Unknown" ? "영어" : v.language,
  }));

  return NextResponse.json({ videos: payload, nextPage: data.length === limit ? page + 1 : null });
}
