"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, ShieldAlert, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = envEmails ? envEmails.split(",").map(e => e.trim()) : [];
    
    if (user?.email && adminEmails.includes(user.email)) {
      setIsAdmin(true);
      fetchPendingVideos();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchPendingVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("status", "pending")
      .order("published_at", { ascending: false });
      
    if (data) setVideos(data);
    setLoading(false);
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`정말 이 영상을 ${action === 'approve' ? '승인' : '거절'}하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/${action}/${id}`, { method: 'POST' });
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.youtube_id !== id));
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-neon-blue" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center flex-col gap-4 text-center p-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
        <h1 className="text-3xl font-black text-white px-8 py-3 bg-red-500/10 border border-red-500/30 rounded-full">Access Denied</h1>
        <p className="text-gray-400 max-w-sm mt-4 leading-relaxed">이 페이지는 <span className="text-neon-blue font-bold">최고 관리자</span> 전용 구역입니다. 접근 권한이 확인되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 px-4 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white mb-3 flex items-center gap-3">
            <ShieldAlert className="text-neon-purple w-8 h-8" />
            Admin Supervisor
          </h1>
          <p className="text-gray-400">유저들이 출품한 대기 상태의 영상들을 심사하고 승인합니다.</p>
        </div>
        <button onClick={fetchPendingVideos} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-bold text-white flex items-center gap-2 w-max">
          <RefreshCw className="w-4 h-4" /> 새로고침
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="w-full py-32 glass rounded-3xl flex flex-col items-center justify-center text-center border-dashed">
          <Check className="w-16 h-16 text-green-500/50 mb-6 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]" />
          <h2 className="text-2xl font-bold text-gray-200">현재 대기 중인 출품작이 없습니다</h2>
          <p className="text-gray-500 mt-3">모든 심사가 완료되었습니다. 멋진 작품들을 기다려주세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map(video => (
            <div key={video.youtube_id} className="glass rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all flex flex-col">
              <a href={`https://youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer" className="relative aspect-video block group w-full">
                {video.thumbnail_url ? (
                  <Image src={video.thumbnail_url} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gray-900" />
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <ExternalLink className="w-10 h-10 text-neon-blue drop-shadow-[0_0_10px_rgba(0,242,254,0.8)]" />
                </div>
              </a>
              
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-bold text-white line-clamp-2 text-sm mb-3 leading-snug">{video.title}</h3>
                <p className="text-xs text-gray-400 mb-6 line-clamp-3 leading-relaxed">{video.description}</p>
                
                <div className="text-xs font-mono text-neon-blue mb-6 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-neon-blue/10 break-all">{video.channel_title}</span>
                  <span className="px-2 py-1 rounded bg-white/5">{video.language}</span>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-3 pt-5 border-t border-white/5">
                  <button 
                    onClick={() => handleAction(video.youtube_id, 'reject')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 font-bold text-sm"
                  >
                    <X className="w-4 h-4" /> 극비 폐기
                  </button>
                  <button 
                    onClick={() => handleAction(video.youtube_id, 'approve')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple hover:bg-neon-purple hover:text-white transition-all border border-neon-purple/30 font-bold text-sm shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                  >
                    <Check className="w-4 h-4" /> 사이트 승인
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
