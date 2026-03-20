"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

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
}

export function VideoCard({ video }: { video: VideoProps }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="relative group cursor-pointer glass rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:border-neon-blue/50"
    >
      <div className="relative aspect-video w-full overflow-hidden">
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

        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-xs font-mono text-white border border-white/10">
          {video.duration}
        </div>
        {video.isDrama && video.episode && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-neon-purple/80 backdrop-blur-md text-xs font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
            EP.{String(video.episode).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight mb-2 group-hover:text-neon-blue transition-colors">
          {video.title}
        </h3>
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {video.channelTitle && <span>{video.channelTitle}</span>}
          <div className="flex items-center gap-2">
            <span>{video.views}</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>{video.uploadedAt}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
