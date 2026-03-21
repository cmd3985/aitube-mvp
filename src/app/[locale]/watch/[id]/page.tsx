import { supabase } from "@/lib/supabase";
import { WatchContent } from "./WatchContent";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: video } = await supabase
    .from("videos")
    .select("title, description, thumbnail_url")
    .eq("youtube_id", id)
    .single();

  return {
    title: video ? `${video.title} | GenCine` : "GenCine",
    description: video?.description?.slice(0, 160) || "Watch AI Cinema on GenCine",
    openGraph: {
      title: video?.title || "GenCine",
      description: video?.description?.slice(0, 160) || "Watch AI Cinema on GenCine",
      images: video?.thumbnail_url ? [video.thumbnail_url] : [],
    },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;

  // Fetch video
  const { data: video, error } = await supabase
    .from("videos")
    .select("*")
    .eq("youtube_id", id)
    .single();

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 text-lg">Video not found.</p>
      </div>
    );
  }

  // Fetch recommended
  const { data: recommended } = await supabase
    .from("videos")
    .select("*")
    .neq("youtube_id", id)
    .order("engagement_score", { ascending: false })
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

  const videoData = formatVideo(video);
  const recommendedData = (recommended || []).map(formatVideo);

  return <WatchContent video={videoData} recommended={recommendedData} />;
}
