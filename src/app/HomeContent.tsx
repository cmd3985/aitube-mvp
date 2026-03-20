"use client";

import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import type { YouTubeVideoInfo } from "@/lib/youtube";

export function HomeContent({ initialVideos }: { initialVideos: VideoProps[] }) {
  const [activeSort, setActiveSort] = useState("Popular");

  // Filtering (only sorts now since tool filter is removed)
  const filteredVideos = initialVideos.sort((a, b) => {
    if (activeSort === "Popular") {
      const aViews = parseInt(a.views.replace(/\D/g, "")) || 0;
      const bViews = parseInt(b.views.replace(/\D/g, "")) || 0;
      return bViews - aViews;
    }
    if (activeSort === "Latest") {
      // Just mock sorting or rely on DB order
      return 0; // DB already sorts by Popular usually, if Latest, would compare uploadedAt
    }
    if (activeSort === "Longest") {
      const getSecs = (duration: string) => {
        const parts = duration.split(":").map(Number);
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        return parts[0]*60 + parts[1];
      };
      return getSecs(b.duration) - getSecs(a.duration);
    }
    return 0;
  });

  return (
    <main className="w-full">
      <FilterBar 
        activeSort={activeSort}
        setActiveSort={setActiveSort}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredVideos.length === 0 ? (
          <div className="text-center text-gray-400 py-20 bg-white/5 rounded-xl border border-white/10 glass">
            <p className="text-lg">No content found.</p>
            <p className="text-sm mt-2">Try selecting a different sort option.</p>
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
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
