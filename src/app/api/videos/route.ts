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
    if (duration === 'Under 10m') {
      // Matches "M:SS" (e.g. 4:20) or "0M:SS" (e.g. 09:12)
      query = query.or('duration.like._:__,duration.like.0_:__');
    } else if (duration === '10m - 20m') {
      query = query.like('duration', '1_:__');
    } else if (duration === '20m - 30m') {
      query = query.like('duration', '2_:__');
    } else if (duration === '30m - 40m') {
      query = query.like('duration', '3_:__');
    } else if (duration === '40m - 50m') {
      query = query.like('duration', '4_:__');
    } else if (duration === '1h+') {
      // Matches anything with two colons (e.g. 1:04:20)
      query = query.like('duration', '%:%:%');
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

  // Format the output
  const payload = (data || []).map(v => ({
    id: v.youtube_id,
    title: v.title,
    description: v.description || "",
    thumbnail: v.thumbnail_url,
    duration: v.duration,
    views: v.view_count.toString() + " views",
    uploadedAt: v.published_at, 
    rawDate: v.published_at,
    channelTitle: v.channel_title || "Unknown Channel",
    category: v.category,
    ai_tool_tags: Array.isArray(v.ai_tool_tags) ? v.ai_tool_tags.join(",") : v.ai_tool_tags,
    language: !v.language || v.language === "Unknown" ? "영어" : v.language,
  }));

  return NextResponse.json({ videos: payload, nextPage: data.length === limit ? page + 1 : null });
}
