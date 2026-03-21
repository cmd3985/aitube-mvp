"use client";

import { useState, useEffect, useRef } from "react";
import useSWRInfinite from 'swr/infinite';
import { FilterBar } from "@/components/FilterBar";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import { X, Loader } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function HomeContent({ initialVideos }: { initialVideos: VideoProps[] }) {
  const { t, lang } = useLanguage();

  const getDefaultLanguageFilter = (l: string) => {
    switch (l) {
      case "EN": return "영어";
      case "KO": return "한국어";
      case "JA": return "일본어";
      case "ES": return "스페인어";
      case "FR": return "프랑스어";
      case "PT": return "포르투갈어";
      case "ZH": return "중국어";
      case "HI": return "힌디어";
      default: return "영어";
    }
  };

  const defaultLangFilter = getDefaultLanguageFilter(lang);

  const [activeSort, setActiveSort] = useState("popular");
  const [activeDuration, setActiveDuration] = useState("All");
  const [activeLanguage, setActiveLanguage] = useState(defaultLangFilter);
  const [selectedVideo, setSelectedVideo] = useState<VideoProps | null>(null);

  // Sync filter when UI language changes
  useEffect(() => {
    setActiveLanguage(getDefaultLanguageFilter(lang));
  }, [lang]);

  const observerTarget = useRef<HTMLDivElement>(null);

  // SWR Infinite Pagination
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.nextPage) return null; // Reached end
    return `/api/videos?page=${pageIndex + 1}&sort=${activeSort}&duration=${activeDuration}&language=${activeLanguage}`;
  };

  const isDefaultFetch = activeSort === "popular" && activeDuration === "All" && activeLanguage === defaultLangFilter;

  const { data, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    fallbackData: isDefaultFetch 
      ? [{ videos: initialVideos, nextPage: initialVideos.length === 24 ? 2 : null }] 
      : undefined,
    revalidateFirstPage: false,
    revalidateAll: false,
  });

  const displayedVideos: VideoProps[] = data ? data.flatMap(page => page.videos) : [];
  const isReachingEnd = data && data[data.length - 1]?.nextPage === null;

  // Observer Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating && !isReachingEnd) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [isValidating, isReachingEnd, setSize]);

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
        {data && displayedVideos.length === 0 ? (
          <div className="text-center text-gray-400 py-20 bg-white/5 rounded-xl border border-white/10 glass">
            <p className="text-lg">{t("noContent")}</p>
            <p className="text-sm mt-2">{t("tryDifferent")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedVideos.map((video) => (
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
            
            {/* Infinite Scroll Loader Trigger */}
            {!isReachingEnd && (
              <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                {isValidating && (
                  <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-blue rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,254,0.5)]"></div>
                )}
              </div>
            )}
          </>
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
