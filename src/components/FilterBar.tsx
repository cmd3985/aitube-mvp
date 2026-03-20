"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Filter, Clock, Flame, Calendar, PlaySquare } from "lucide-react";

const SORT_OPTIONS = [
  { id: "popular", label: "Popular", icon: Flame },
  { id: "latest", label: "Latest", icon: Calendar },
  { id: "comments", label: "Trending", icon: PlaySquare },
  { id: "runtime", label: "Runtime", icon: Clock },
];

export function FilterBar({ 
  onSortChange 
}: { 
  onSortChange?: (sort: string) => void;
}) {
  const [activeSort, setActiveSort] = useState("popular");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const handleSortClick = (sortId: string) => {
    setActiveSort(sortId);
    setIsSortOpen(false);
    if (onSortChange) onSortChange(sortId);
  };

  const activeSortLabel = SORT_OPTIONS.find(o => o.id === activeSort)?.label;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-4 justify-between items-center z-20 relative">
      
      {/* Left side - We removed the AI tools selector, you can put a title or just leave empty */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-neon-blue" />
        <span className="text-sm font-medium text-gray-300">Sort by</span>
      </div>

      {/* Sort Dropdown */}
      <div className="relative w-full md:w-auto flex justify-end">
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="glass px-4 py-2 rounded-lg flex items-center gap-3 text-sm font-medium text-white hover:border-neon-purple/50 transition-colors w-full md:w-48 justify-between"
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Sort by</span>
            <span>{activeSortLabel}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
        </button>

        {isSortOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 mt-2 w-full md:w-48 glass rounded-lg overflow-hidden flex flex-col p-1 z-50 border-neon-purple/30 shadow-[0_4px_20px_rgba(139,92,246,0.15)]"
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
