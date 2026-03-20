import { supabase } from "@/lib/supabase";
import { HomeContent } from "@/app/HomeContent";

export const metadata = {
  title: "Dramas | AITube",
  description: "AI-generated dramas",
};

export const revalidate = 3600;

export default async function DramasPage() {
  const { data: dbDramas, error } = await supabase
    .from("videos")
    .select("*")
    .eq("category", "Drama")
    .order("view_count", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Error fetching dramas:", error);
  }

  const initialVideos = (dbDramas || []).map(v => ({
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

  return (
    <div className="min-h-screen bg-black text-white w-full pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
          <span className="text-gradient">AI Dramas</span>
        </h1>
        <p className="text-gray-400 mt-2">Explore captivating AI episodic series</p>
      </div>
      <HomeContent initialVideos={initialVideos as any} />
    </div>
  );
}
