"use client";

import { useState, useEffect, useRef } from "react";
import useSWRInfinite from 'swr/infinite';
import { FilterBar } from "@/components/FilterBar";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import { Loader } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import Link from "next/link";

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

  const [activeSort, setActiveSortState] = useState("popular");
  const [activeDuration, setActiveDurationState] = useState("All");
  const [activeLanguage, setActiveLanguageState] = useState(defaultLangFilter);

  // Load saved state (Client-side only) to prevent SSR hydration errors
  useEffect(() => {
    const savedSort = sessionStorage.getItem('gencine_sort');
    const savedDur = sessionStorage.getItem('gencine_duration');
    const savedLang = sessionStorage.getItem('gencine_lang');
    
    if (savedSort) setActiveSortState(savedSort);
    if (savedDur) setActiveDurationState(savedDur);
    if (savedLang) setActiveLanguageState(savedLang);
  }, []);

  const setActiveSort = (val: string) => {
    setActiveSortState(val);
    if (typeof window !== 'undefined') sessionStorage.setItem('gencine_sort', val);
  };
  
  const setActiveDuration = (val: string) => {
    setActiveDurationState(val);
    if (typeof window !== 'undefined') sessionStorage.setItem('gencine_duration', val);
  };
  
  const setActiveLanguage = (val: string) => {
    setActiveLanguageState(val);
    if (typeof window !== 'undefined') sessionStorage.setItem('gencine_lang', val);
  };

  const initialLang = useRef(lang);
  // Sync filter when UI language changes
  useEffect(() => {
    if (initialLang.current !== lang) {
      initialLang.current = lang;
      // When global site language changes, overwrite session state and reset to default
      const newDefault = getDefaultLanguageFilter(lang);
      setActiveLanguage(newDefault);
    }
  }, [lang]);

  const observerTarget = useRef<HTMLDivElement>(null);

  // SWR Infinite Pagination
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.nextPage) return null; // Reached end
    return `/api/videos?page=${pageIndex + 1}&sort=${activeSort}&duration=${encodeURIComponent(activeDuration)}&language=${encodeURIComponent(activeLanguage)}`;
  };

  const isDefaultFetch = activeSort === "popular" && activeDuration === "All" && activeLanguage === defaultLangFilter;

  const { data, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    fallbackData: isDefaultFetch 
      ? [{ videos: initialVideos, nextPage: initialVideos.length === 24 ? 2 : null }] 
      : undefined,
    revalidateFirstPage: false,
    revalidateAll: false,
  });

  const displayedVideos: VideoProps[] = data 
    ? data.flatMap(page => Array.isArray(page?.videos) ? page.videos : []) 
    : [];
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
                <Link key={video.id} href={`/${lang.toLowerCase()}/watch/${video.id}`}>
                  <VideoCard 
                    video={{
                      ...video,
                      isDrama: video.title.toLowerCase().includes("episode") || video.title.toLowerCase().includes("ep."),
                      episode: video.title.toLowerCase().includes("ep.") ? 1 : undefined
                    }} 
                  />
                </Link>
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
    </main>
  );
}
