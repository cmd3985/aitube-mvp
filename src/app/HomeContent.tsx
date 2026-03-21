"use client";

import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import type { YouTubeVideoInfo } from "@/lib/youtube";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function HomeContent({ initialVideos }: { initialVideos: VideoProps[] }) {
  const { t } = useLanguage();
  const [activeSort, setActiveSort] = useState("popular");
  const [activeDuration, setActiveDuration] = useState("All");
  const [activeLanguage, setActiveLanguage] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState<VideoProps | null>(null);

  const getSecs = (duration: string) => {
    const parts = duration.split(":").map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    return parts[0]*60 + parts[1];
  };

  // Filtering and sorting
  const filteredVideos = initialVideos.filter(v => {
    // 1. Language Filter
    if (activeLanguage !== "All") {
      // If language is somehow undefined or missing on old records, fallback check or just hide
      const vLang = v.language || "Unknown";
      if (vLang !== activeLanguage) return false;
    }

    // 2. Duration Filter
    if (activeDuration === "All") return true;
    const m = getSecs(v.duration) / 60;
    if (activeDuration === "Under 10m") return m < 10;
    if (activeDuration === "10m - 20m") return m >= 10 && m < 20;
    if (activeDuration === "20m - 30m") return m >= 20 && m < 30;
    if (activeDuration === "30m - 40m") return m >= 30 && m < 40;
    if (activeDuration === "40m - 50m") return m >= 40 && m < 50;
    if (activeDuration === "1h+") return m >= 60;
    return true;
  }).sort((a, b) => {
    if (activeSort === "popular") {
      const aViews = parseInt(a.views.replace(/\D/g, "")) || 0;
      const bViews = parseInt(b.views.replace(/\D/g, "")) || 0;
      return bViews - aViews;
    }
    if (activeSort === "latest") {
      const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      return dateB - dateA;
    }
    if (activeSort === "trending") {
      const getTrendingScore = (v: VideoProps) => {
        const views = parseInt(v.views.replace(/\D/g, "")) || 0;
        const hours = (Date.now() - (v.rawDate ? new Date(v.rawDate).getTime() : Date.now())) / (1000 * 60 * 60);
        return views / Math.pow(Math.max(hours, 2), 1.5); // HackerNews gravity algorithm
      };
      return getTrendingScore(b) - getTrendingScore(a);
    }
    if (activeSort === "runtime") {
      return getSecs(b.duration) - getSecs(a.duration);
    }
    return 0;
  });

  return (
    <main className="w-full">
      <FilterBar 
        onSortChange={setActiveSort}
        activeDuration={activeDuration}
        onDurationChange={setActiveDuration}
        activeLanguage={activeLanguage}
        onLanguageChange={setActiveLanguage}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredVideos.length === 0 ? (
          <div className="text-center text-gray-400 py-20 bg-white/5 rounded-xl border border-white/10 glass">
            <p className="text-lg">{t("noContent")}</p>
            <p className="text-sm mt-2">{t("tryDifferent")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={{
                  ...video,
                  isDrama: video.title.toLowerCase().includes("episode") || video.title.toLowerCase().includes("ep."),
                  episode: video.title.toLowerCase().includes("ep.") ? 1 : undefined
                }} 
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Modal Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setSelectedVideo(null)}
          />
          <div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden glass border-neon-blue/50 shadow-[0_0_50px_rgba(0,242,254,0.15)] animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-neon-purple/80 text-white transition-colors border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
              title={selectedVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </main>
  );
}
