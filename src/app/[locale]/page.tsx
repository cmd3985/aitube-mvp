import { Hero } from "@/components/Hero";
import { supabase } from "@/lib/supabase";
import { HomeContent } from "./HomeContent";

export const revalidate = 0;

export default async function Home({ params }: { params: Promise<{ locale: string }> | { locale: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const locale = resolvedParams.locale;

  const langMap: Record<string, string> = {
    "en": "영어", "ko": "한국어", "ja": "일본어", "es": "스페인어", 
    "fr": "프랑스어", "pt": "포르투갈어", "zh": "중국어", "hi": "힌디어"
  };
  const dbLang = langMap[locale] || "영어";

  const { data: videosFromDb, error } = await supabase
    .from("videos")
    .select("*")
    .eq('language', dbLang)
    .order("engagement_score", { ascending: false })
    .limit(24);

  if (error) {
    console.error("Error fetching videos:", error);
  }

  const initialVideos = (videosFromDb || []).map(v => ({
    id: v.youtube_id,
    title: v.title,
    description: v.description || "",
    thumbnail: v.thumbnail_url,
    duration: v.duration,
    views: v.view_count.toString() + " views",
    uploadedAt: v.published_at, // this actually is ISO string but formatted later? Wait, timeAgo is done in fetch, so it's a string like "5 months ago".
    rawDate: v.published_at,
    channelTitle: v.channel_title || "Unknown Channel",
    category: v.category,
    ai_tool_tags: Array.isArray(v.ai_tool_tags) ? v.ai_tool_tags.join(",") : v.ai_tool_tags,
    language: !v.language || v.language === "Unknown" ? "영어" : v.language,
  }));

  return (
    <div className="min-h-screen bg-black text-white w-full">
      <Hero />
      <HomeContent initialVideos={initialVideos as any} />
    </div>
  );
}
