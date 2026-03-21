import { createClient } from "@/utils/supabase/server";
import { MyListContent } from "./MyListContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My List | GenCine",
  description: "Your personal library of AI Cinema masterpieces.",
};

export default async function MyListPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Rendere guest landing page
    return <MyListContent user={null} initialVideos={[]} />;
  }

  // Fetch bookmarks
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select(`
      video_id,
      videos (*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return String(num);
  };

  const formattedVideos = (bookmarks || []).map((b: any) => {
    const v = b.videos;
    return {
      id: v.youtube_id,
      title: v.title,
      description: v.description || "",
      thumbnail: v.thumbnail_url,
      duration: v.duration,
      views: formatViews(v.view_count) + " views",
      rawViewCount: v.view_count,
      likeCount: v.like_count || 0,
      commentCount: v.comment_count || 0,
      uploadedAt: v.published_at, // normally timeAgo format in our system, but we might just pass raw for now
      rawDate: v.published_at,
      channelTitle: v.channel_title || "Unknown Channel",
      category: v.category,
      language: !v.language || v.language === "Unknown" ? "영어" : v.language,
    };
  });

  return <MyListContent user={user} initialVideos={formattedVideos} />;
}
