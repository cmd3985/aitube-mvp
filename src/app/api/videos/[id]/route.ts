import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch the main video by youtube_id
  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('youtube_id', id)
    .single();

  if (error || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // 2. Fetch recommended videos (top engagement, exclude current)
  const { data: recommended } = await supabase
    .from('videos')
    .select('*')
    .neq('youtube_id', id)
    .order('engagement_score', { ascending: false })
    .limit(8);

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return String(num);
  };

  const formatVideo = (v: any) => ({
    id: v.youtube_id,
    title: v.title,
    description: v.description || "",
    thumbnail: v.thumbnail_url,
    duration: v.duration,
    views: formatViews(v.view_count),
    rawViewCount: v.view_count,
    likeCount: v.like_count || 0,
    commentCount: v.comment_count || 0,
    uploadedAt: v.published_at,
    rawDate: v.published_at,
    channelTitle: v.channel_title || "Unknown Channel",
    category: v.category,
    ai_tool_tags: Array.isArray(v.ai_tool_tags) ? v.ai_tool_tags.join(",") : v.ai_tool_tags,
    language: !v.language || v.language === "Unknown" ? "영어" : v.language,
    engagementScore: v.engagement_score || 0,
  });

  return NextResponse.json({
    video: formatVideo(video),
    recommended: (recommended || []).map(formatVideo),
  });
}
