"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Bookmark, Lock } from "lucide-react";
import { VideoCard, VideoProps } from "@/components/VideoCard";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export function MyListContent({ user, initialVideos }: { user: any | null, initialVideos: VideoProps[] }) {
  const { t, lang } = useLanguage();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // 1. Guest Landing State
  if (!user) {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
        {/* Blurred background image mock */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl z-10" />
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop')] bg-cover bg-center opacity-30 blur-sm" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 max-w-2xl px-4 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 border border-neon-purple/50 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            <Lock className="w-10 h-10 text-neon-blue" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
            {t("myListTitle")}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto font-light leading-relaxed">
            {t("myListSubtitle")}
          </p>

          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("loginGoogle")}
          </button>
        </motion.div>
      </main>
    );
  }

  // 2. Auth Empty State
  if (initialVideos.length === 0) {
    return (
      <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-neon-purple" />
          {t("myList")}
        </h1>
        <div className="w-full h-[60vh] flex flex-col items-center justify-center glass rounded-2xl border border-white/5">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-xl text-gray-400 font-medium mb-2">{t("emptyMyList")}</p>
          <Link href={`/${lang.toLowerCase()}`} className="mt-6 px-6 py-2 rounded-full border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 transition-colors">
            {t("home")}
          </Link>
        </div>
      </main>
    );
  }

  // 3. Auth Grid View
  return (
    <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Bookmark className="w-8 h-8 text-neon-purple" />
        {t("myList")}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {initialVideos.map((video) => (
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
    </main>
  );
}
