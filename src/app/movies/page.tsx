import { supabase } from "@/lib/supabase";
import { HomeContent } from "@/app/HomeContent";

export const metadata = {
  title: "Movies | AITube",
  description: "AI-generated movies",
};

export const revalidate = 3600;

export default async function MoviesPage() {
  const { data: dbMovies, error } = await supabase
    .from("videos")
    .select("*")
    .eq("category", "Movie")
    .order("view_count", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching movies:", error);
  }

  const initialVideos = (dbMovies || []).map(v => ({
    id: v.youtube_id,
    title: v.title,
    description: v.description || "",
    thumbnail: v.thumbnail_url,
    duration: v.duration,
    views: v.view_count.toString() + " views",
    uploadedAt: v.published_at,
    channelTitle: "AI Creator",
    category: v.category,
    ai_tool_tags: Array.isArray(v.ai_tool_tags) ? v.ai_tool_tags.join(",") : v.ai_tool_tags,
  }));

  return (
    <div className="min-h-screen bg-black text-white w-full pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
          <span className="text-gradient">AI Movies</span>
        </h1>
        <p className="text-gray-400 mt-2">Discover the best cinematic AI films</p>
      </div>
      <HomeContent initialVideos={initialVideos as any} />
    </div>
  );
}
