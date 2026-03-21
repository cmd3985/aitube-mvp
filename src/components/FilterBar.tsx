"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, ChevronDown, Filter, Clock, Flame, Calendar, PlaySquare } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export const DURATIONS = [
  "All", 
  "Under 5m", 
  "5m - 10m", 
  "10m - 20m", 
  "20m+"
];
export const LANGUAGES = [
  "All",
  "영어",
  "프랑스어",
  "스페인어",
  "포르투갈어",
  "한국어",
  "일본어",
  "중국어",
  "힌디어",
  "아랍어",
  "인도네시아어",
  "러시아어",
  "독일어",
  "No Dialogue"
];

export function FilterBar({ 
  onSortChange,
  activeDuration = "All",
  onDurationChange,
  activeLanguage = "All",
  onLanguageChange
}: { 
  onSortChange?: (sort: string) => void;
  activeDuration?: string;
  onDurationChange?: (duration: string) => void;
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}) {
  const { t } = useLanguage();
  const [activeSort, setActiveSort] = useState("popular");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const SORT_OPTIONS = [
    { id: "popular", label: t("popular"), icon: Flame },
    { id: "latest", label: t("latest"), icon: Calendar },
    { id: "trending", label: t("trending"), icon: PlaySquare },
    { id: "runtime", label: t("runtime"), icon: Clock },
  ];

  const getDurationDisplay = (d: string) => {
    if (d === "All") return t("all");
    if (d === "Under 5m") return t("under5m");
    if (d === "5m - 10m") return t("5mTo10m");
    if (d === "10m - 20m") return t("10mTo20m");
    if (d === "20m+") return t("over20m");
    return d;
  };

  const getLangDisplay = (l: string) => {
    if (l === "All") return t("all");
    const map: Record<string, string> = {
      "영어": "english", "프랑스어": "french", "스페인어": "spanish", 
      "포르투갈어": "portuguese", "한국어": "korean", "일본어": "japanese", 
      "중국어": "chinese", "힌디어": "hindi",
      "아랍어": "arabic", "인도네시아어": "indonesian", "러시아어": "russian", "독일어": "german",
      "No Dialogue": "noDialogue"
    };
    return map[l] ? t(map[l]) : l;
  };

  const handleSortClick = (sortId: string) => {
    setActiveSort(sortId);
    setIsSortOpen(false);
    if (onSortChange) onSortChange(sortId);
  };

  const activeSortLabel = SORT_OPTIONS.find(o => o.id === activeSort)?.label;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-start gap-4 z-20 relative">
      
      {/* Left Column: Flowing Filters */}
      <div className="flex flex-col gap-4 flex-grow w-full overflow-hidden">
        {/* Top Row: Language Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-hide snap-x">
          <div className="flex items-center gap-2 text-gray-400 mr-2 flex-shrink-0">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">{t("language")}</span>
          </div>
          {LANGUAGES.map((lang) => {
            const isActive = activeLanguage === lang;
            return (
              <button
                key={lang}
                onClick={() => onLanguageChange && onLanguageChange(lang)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 snap-start
                  ${isActive ? "text-white" : "text-gray-400 hover:text-white glass"}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="filter-language-active"
                    className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 rounded-full border border-neon-purple/50 neon-shadow-purple"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{getLangDisplay(lang)}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Row: Duration Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-hide snap-x">
          <div className="flex items-center gap-2 text-gray-400 mr-2 flex-shrink-0">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{t("duration")}</span>
          </div>
          {DURATIONS.map((dur) => {
            const isActive = activeDuration === dur;
            return (
              <button
                key={dur}
                onClick={() => onDurationChange && onDurationChange(dur)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 snap-start
                  ${isActive ? "text-white" : "text-gray-400 hover:text-white glass"}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="filter-duration-active"
                    className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-full border border-neon-blue/50 neon-shadow-blue"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{getDurationDisplay(dur)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Sort Dropdown (Visible on all breakpoints now) */}
      <div className="relative w-full md:w-48 flex-shrink-0 z-50">
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="glass px-4 py-2 rounded-lg flex items-center gap-3 text-sm font-medium text-white hover:border-neon-purple/50 transition-colors w-full justify-between"
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t("sortBy")}</span>
            <span>{activeSortLabel}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
        </button>

        {isSortOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 mt-2 w-full glass rounded-lg overflow-hidden flex flex-col p-1 z-50 border-neon-purple/30 shadow-[0_4px_20px_rgba(139,92,246,0.15)]"
          >
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeSort === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSortClick(option.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left
                    ${isActive ? "bg-white/10 text-neon-blue font-medium" : "text-gray-300 hover:bg-white/5 hover:text-white"}
                  `}
                >
                  <Icon className="w-4 h-4 opacity-70" />
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
      
    </div>
  );
}
