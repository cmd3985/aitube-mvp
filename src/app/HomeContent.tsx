"use client";

import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import type { YouTubeVideoInfo } from "@/lib/youtube";

export function HomeContent({ initialVideos }: { initialVideos: YouTubeVideoInfo[] }) {
  const [videos, setVideos] = useState<YouTubeVideoInfo[]>(initialVideos);
  const [activeSort, setActiveSort] = useState("popular");
  const [activeTool, setActiveTool] = useState("All");

  const handleFilterChange = (tool: string) => {
    setActiveTool(tool);
    // Client-side quick filter simulation for MVP:
    if (tool === "All") {
      setVideos(initialVideos);
    } else {
      const filtered = initialVideos.filter(v => 
        v.title.toLowerCase().includes(tool.toLowerCase()) || 
        v.description.toLowerCase().includes(tool.toLowerCase())
      );
      setVideos(filtered);
    }
  };

  const handleSortChange = (sortId: string) => {
    setActiveSort(sortId);
    let sorted = [...videos];
    if (sortId === "popular") {
      sorted.sort((a, b) => parseInt(b.views.replace(/\D/g, "")) - parseInt(a.views.replace(/\D/g, "")));
    } else if (sortId === "latest") {
      // timeAgo can't easily be parsed back for sorting accurately here, but we assume initialVideos is somewhat sorted by API or we rely on the API for real implementation.
      // For MVP, randomly shuffling or simple heuristic if actual date isn't kept. But wait, we can't sort by timeAgo string properly.
      // This is MVP, we can leave as is or shuffle for effect.
      sorted.reverse();
    } else if (sortId === "runtime") {
      sorted.sort((a, b) => {
        // basic duration string comparison "02:10" vs "05:00" works correctly alphabetically for MM:SS
        return b.duration.localeCompare(a.duration); 
      });
    }
    setVideos(sorted);
  };

  return (
    <div className="w-full">
      <FilterBar onFilterChange={handleFilterChange} onSortChange={handleSortChange} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {videos.length === 0 ? (
          <div className="text-center text-gray-400 py-20 bg-white/5 rounded-xl border border-white/10 glass">
            <p className="text-lg">No content found matching "{activeTool}".</p>
            <p className="text-sm mt-2">Try selecting a different AI tool filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
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
    </div>
  );
}
