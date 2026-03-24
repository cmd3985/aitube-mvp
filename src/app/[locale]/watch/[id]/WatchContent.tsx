"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ThumbsUp, MessageCircle, ChevronDown, ChevronUp, Calendar, User } from "lucide-react";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import { useLanguage } from "@/i18n/LanguageContext";
import Link from "next/link";

interface WatchVideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  rawViewCount: number;
  likeCount: number;
  commentCount: number;
  uploadedAt: string;
  rawDate: string;
  channelTitle: string;
  category: string;
  ai_tool_tags: string;
  language: string;
  engagementScore: number;
  is_cc: boolean;
}

function formatCompact(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
}

export function WatchContent({ video, recommended }: { video: WatchVideoData; recommended: WatchVideoData[] }) {
  const { t, lang } = useLanguage();
  const [descExpanded, setDescExpanded] = useState(false);

  const recommendedAsVideoProps: VideoProps[] = recommended.map(r => ({
    id: r.id,
    title: r.title,
    thumbnail: r.thumbnail,
    duration: r.duration,
    views: r.views + " views",
    uploadedAt: r.uploadedAt,
    channelTitle: r.channelTitle,
    rawDate: r.rawDate,
    language: r.language,
    is_cc: r.is_cc,
  }));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== THEATER MODE: Full-Width Player with Ambient Glow ===== */}
      <section className="relative w-full bg-zinc-950">
        {/* Ambient Glow Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(0,242,254,0.08),transparent_50%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[180%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_50%)]" />
        </div>

        {/* Player Container */}
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-8">
          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,242,254,0.12),0_0_120px_rgba(139,92,246,0.08)] border border-white/5">
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== VIDEO INFO SECTION ===== */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold leading-snug mb-4 flex items-start gap-3">
          {video.is_cc && (
            <span className="shrink-0 mt-1 px-2 py-0.5 text-sm font-bold bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded" title="Creative Commons (2차 창작 가능)">
              CC
            </span>
          )}
          <span>{video.title}</span>
        </h1>

        {/* Social Proof Row */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <div className="flex items-center gap-2 text-gray-300">
            <Eye className="w-5 h-5 text-neon-blue" />
            <span className="text-sm font-medium">{formatCompact(video.rawViewCount)} {t("views")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <ThumbsUp className="w-5 h-5 text-neon-purple" />
            <span className="text-sm font-medium">{formatCompact(video.likeCount)} {t("likes")}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium">{formatCompact(video.commentCount)} {t("comments")}</span>
          </div>
        </div>

        {/* Creator Info Card */}
        <div className="glass rounded-xl p-4 mb-6 border border-white/5">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-neon-blue" />
              <span className="font-medium text-white">{video.channelTitle}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-purple" />
              <span>{video.uploadedAt}</span>
            </div>
            {video.language && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs">{video.language}</span>
              </>
            )}
            {video.ai_tool_tags && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:block" />
                <div className="flex gap-1.5 flex-wrap">
                  {video.ai_tool_tags.split(",").map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-xs text-purple-300">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expandable Description */}
          {video.description && (
            <div className="mt-4">
              <AnimatePresence initial={false}>
                <motion.div
                  key="desc"
                  initial={false}
                  animate={{ height: descExpanded ? "auto" : "4.5rem" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                    {video.description}
                  </p>
                </motion.div>
              </AnimatePresence>
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-neon-blue hover:text-cyan-300 transition-colors"
              >
                {descExpanded ? (
                  <>{t("showLess")} <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>{t("showMore")} <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ===== RECOMMENDED VIDEOS ===== */}
        {recommendedAsVideoProps.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-6 rounded-full bg-gradient-to-b from-neon-blue to-neon-purple" />
              {t("recommended")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendedAsVideoProps.map((rec) => (
                <Link key={rec.id} href={`/${lang.toLowerCase()}/watch/${rec.id}`}>
                  <VideoCard video={rec} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
