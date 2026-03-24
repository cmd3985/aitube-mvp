"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Heart, X, LogIn, Bookmark, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface VideoProps {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
  channelTitle?: string;
  isDrama?: boolean;
  episode?: number;
  language?: string;
  rawDate?: string;
  is_cc?: boolean;
}

export function VideoCard({ video, onClick }: { video: VideoProps, onClick?: () => void }) {
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);

  const getRelativeTime = (dateStr: string) => {
    // Legacy fallback for pre-migration data
    if (!dateStr || dateStr.includes("ago")) {
      return (dateStr || "")
        .replace(" months ago", " " + t("monthsAgo"))
        .replace(" days ago", " " + t("daysAgo"))
        .replace(" hours ago", " " + t("hoursAgo"))
        .replace(" a month ago", " 1 " + t("monthsAgo"));
    }
    
    // ISO-8601 formatting using native browser Intl
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      const rtfLocale = { "EN": "en", "KO": "ko", "JA": "ja", "ES": "es", "FR": "fr", "PT": "pt", "ZH": "zh", "HI": "hi", "AR": "ar", "ID": "id", "RU": "ru", "DE": "de" }[lang || "EN"] || "en";
      const rtf = new Intl.RelativeTimeFormat(rtfLocale, { numeric: 'auto' });
      
      if (seconds < 60) return rtf.format(-seconds, 'second');
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return rtf.format(-minutes, 'minute');
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return rtf.format(-hours, 'hour');
      const days = Math.floor(hours / 24);
      if (days < 30) return rtf.format(-days, 'day');
      const months = Math.floor(days / 30);
      if (months < 12) return rtf.format(-months, 'month');
      const years = Math.floor(days / 365);
      return rtf.format(-years, 'year');
    } catch (e) {
      return dateStr;
    }
  };
  const [isDeleted, setIsDeleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkBookmarkStatus(currentUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkBookmarkStatus(currentUser.id);
      } else {
        setIsBookmarked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [video.id]);

  const checkBookmarkStatus = async (userId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("video_id", video.id)
      .maybeSingle();
      
    if (data) setIsBookmarked(true);
  };

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowNudge(true);
      return;
    }

    // Optimistic UI toggle
    const newStatus = !isBookmarked;
    setIsBookmarked(newStatus);

    if (newStatus) {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        video_id: video.id
      });
      if (error) {
        console.error("Bookmark Error:", error);
        alert("Failed to save bookmark. " + (error.message || ""));
        setIsBookmarked(false); // Rollback
      }
    } else {
      const { error } = await supabase.from("bookmarks").delete()
        .eq("user_id", user.id)
        .eq("video_id", video.id);
      if (error) {
        console.error("Bookmark Error:", error);
        alert("Failed to remove bookmark. " + (error.message || ""));
        setIsBookmarked(true); // Rollback
      }
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const adminEmails = envEmails ? envEmails.split(",").map(e => e.trim()) : [];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;

    if (!confirm("정말 이 영상을 데이터베이스에서 완전히 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/admin/videos/${video.id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsDeleted(true);
      } else {
        const errorData = await res.json();
        alert("삭제 실패: " + errorData.error);
      }
    } catch (e: any) {
      alert("에러 발생: " + e.message);
    }
  };

  if (isDeleted) return null;

  return (
    <>
      <motion.div
        onClick={onClick}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        className="relative group cursor-pointer glass rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:border-neon-blue/50"
      >
        <div className="relative aspect-video w-full overflow-hidden flex-shrink-0">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neon-blue/20 backdrop-blur-md flex items-center justify-center border border-neon-blue/50 text-neon-blue">
              <Play className="w-6 h-6 ml-1" />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-xs font-mono text-white border border-white/10 z-10 pointer-events-none">
            {video.duration}
          </div>
          
          {video.isDrama && video.episode && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-neon-purple/80 backdrop-blur-md text-xs font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)] z-10 pointer-events-none">
              EP.{String(video.episode).padStart(2, "0")}
            </div>
          )}

          {/* Admin Delete Button */}
          {isAdmin && (
            <div className="absolute top-3 left-3 z-20">
              <button
                onClick={handleDelete}
                className="p-2.5 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors shadow-lg backdrop-blur-md"
                title="Delete Video (Admin Only)"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* Heart Bookmark Button */}
          <button
            onClick={toggleBookmark}
            className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isBookmarked 
                ? "bg-neon-purple/90 border-neon-purple shadow-[0_0_10px_rgba(139,92,246,0.8)] opacity-100 translate-y-0" 
                : "bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/20 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
            }`}
          >
            <Heart 
              className={`w-4 h-4 transition-transform duration-300 ${
                isBookmarked ? "text-white fill-white scale-110" : "text-white fill-transparent"
              }`} 
            />
          </button>
        </div>

        <div className="p-4 flex-grow flex flex-col justify-between">
          <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight mb-2 group-hover:text-neon-blue transition-colors">
            {video.is_cc && (
              <span className="inline-block px-1.5 py-0.5 mr-1.5 align-middle text-[9px] tracking-wide font-bold bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded" title="Creative Commons (2차 창작 가능)">
                CC
              </span>
            )}
            {video.title}
          </h3>
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            {video.channelTitle && <span>{video.channelTitle}</span>}
            <div className="flex items-center gap-2">
              <span>{video.views.replace(" views", " " + t("views"))}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span>{getRelativeTime(video.uploadedAt)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Guest Login Nudge Modal */}
      <AnimatePresence>
        {showNudge && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNudge(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass rounded-2xl overflow-hidden border border-neon-purple/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col"
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNudge(false); }}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 border border-neon-purple/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  <Bookmark className="w-8 h-8 text-neon-purple" />
                </div>
                <h2 className="text-xl font-bold mb-3">{t("saveToMyList")}</h2>
                <p className="text-sm text-gray-400 mb-8 max-w-[280px]">
                  {t("myListSubtitle")}
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t("continueWithGoogle")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
