"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Check, X, ShieldAlert, ExternalLink, RefreshCw, LayoutDashboard, Tv, Plus, Trash2, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'channels'>('pending');
  
  // Channels State
  const [newChannelInput, setNewChannelInput] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

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
      fetchMonitoredChannels();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchPendingVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("status", "pending")
      .order("published_at", { ascending: false });
      
    if (data) setVideos(data);
    setLoading(false);
  };

  const fetchMonitoredChannels = async () => {
    const res = await fetch("/api/admin/channels");
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels || []);
    }
  };

  const fetchVideosForChannel = async (channel: any) => {
    setSelectedChannel(channel);
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("channel_title", channel.title)
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

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelInput.trim()) return;
    setIsAddingChannel(true);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: newChannelInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannels([data.channel, ...channels]);
        setNewChannelInput("");
        // Kick off asynchronous full-channel sync without blocking UI
        triggerFullSync(data.channel.channel_id, data.channel.title);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingChannel(false);
    }
  };

  // Iteratively sync all past videos for a newly registered channel
  const triggerFullSync = async (channelId: string, channelTitle: string) => {
    let pageToken: string | null = null;
    let keepFetching = true;
    let pageCount = 1;

    console.log(`[SYNC] Starting full backfill for ${channelTitle}...`);

    while (keepFetching) {
      try {
        const body: any = { channel_id: channelId };
        if (pageToken) body.pageToken = pageToken;

        const res = await fetch("/api/admin/channels/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          console.error(`[SYNC] Failed at page ${pageCount}`);
          break;
        }

        const data = await res.json();
        console.log(`[SYNC] Page ${pageCount} processed ${data.processed_count} videos, upserted ${data.upserted_count}`);

        if (data.nextPageToken) {
          pageToken = data.nextPageToken;
          pageCount++;
        } else {
          keepFetching = false;
          console.log(`[SYNC] Finished backfill for ${channelTitle}.`);
        }
      } catch (err) {
        console.error("[SYNC] Network error during full sync:", err);
        break;
      }
    }
  };

  const handleRemoveChannel = async (id: string, title: string) => {
    if (!confirm(`정말 "${title}" 채널의 자동 등록을 해제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/channels/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChannels(channels.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && videos.length === 0 && channels.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-neon-blue" /></div>;
  }

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
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-3 flex items-center gap-3">
              <ShieldAlert className="text-neon-purple w-8 h-8" />
              Admin Supervisor
            </h1>
            <p className="text-gray-400">플랫폼 영상 퀄리티를 관리하고 모니터링합니다.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-1">
          <button 
            onClick={() => {
              setActiveTab('pending');
              setSelectedChannel(null);
              fetchPendingVideos();
            }}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-all font-bold ${activeTab === 'pending' ? 'border-neon-blue text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> 대기작 심사
          </button>
          <button 
            onClick={() => {
              setActiveTab('channels');
              setSelectedChannel(null);
            }}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-all font-bold ${activeTab === 'channels' ? 'border-neon-blue text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <Tv className="w-4 h-4" /> 채널 자동수집 관리
          </button>
        </div>
      </div>

      {/* ========== TAB: PENDING VIDEOS ========== */}
      {activeTab === 'pending' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-end mb-6">
            <button onClick={fetchPendingVideos} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-bold text-white flex items-center gap-2 w-max">
              <RefreshCw className="w-4 h-4" /> 심사열 새로고침
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
                  {/* (Video Card Rendering remains the same for pending queue) */}
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
                        <X className="w-4 h-4" /> 폐기
                      </button>
                      <button 
                        onClick={() => handleAction(video.youtube_id, 'approve')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neon-purple/20 text-neon-purple hover:bg-neon-purple hover:text-white transition-all border border-neon-purple/30 font-bold text-sm shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                      >
                        <Check className="w-4 h-4" /> 승인
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: MONITORED CHANNELS ========== */}
      {activeTab === 'channels' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {selectedChannel ? (
            /* Selected Channel Videos View */
            <div className="space-y-6">
              <button 
                onClick={() => setSelectedChannel(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> 뒤로 가기
              </button>
              
              <div className="flex items-center gap-4 p-4 glass rounded-2xl border border-white/10">
                <img src={selectedChannel.thumbnail_url} className="w-16 h-16 rounded-full border-2 border-neon-blue/50" alt="" />
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedChannel.title}</h2>
                  <p className="text-sm text-gray-400">해당 채널에서 수집된 모든 영상 목록입니다.</p>
                </div>
              </div>

              {loading ? (
                 <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-neon-blue" /></div>
              ) : videos.length === 0 ? (
                <div className="w-full py-20 glass rounded-3xl flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500">아직 수집된 영상이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {videos.map(video => (
                    <div key={video.youtube_id} className="glass rounded-2xl overflow-hidden border border-white/10 flex flex-col opacity-75 grayscale-[50%] hover:grayscale-0 hover:opacity-100 transition-all">
                      <a href={`https://youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer" className="relative aspect-video block w-full">
                        {video.thumbnail_url && <Image src={video.thumbnail_url} alt="" fill className="object-cover" />}
                        <div className="absolute top-2 right-2 px-2 py-1 text-[10px] font-bold bg-black/80 rounded uppercase">
                          {video.status}
                        </div>
                      </a>
                      <div className="p-4 flex-grow flex flex-col">
                        <h3 className="font-bold text-white line-clamp-2 text-sm mb-2">{video.title}</h3>
                        <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-xs text-gray-400">
                          <span>{new Date(video.published_at).toLocaleDateString()}</span>
                          <button onClick={() => handleAction(video.youtube_id, 'reject')} className="text-red-400 hover:text-red-300">삭제</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : (
            /* Channel List View */
            <div className="space-y-8">
              {/* Add New Channel Box */}
              <div className="glass p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-neon-blue to-neon-purple" />
                <h2 className="text-lg font-bold text-white mb-2">새 자동수집 채널 등록</h2>
                <p className="text-sm text-gray-400 mb-6">등록된 채널의 새 영상들은 매시간 심사 없이 <span className="text-neon-cyan font-bold">바로 게시</span>됩니다. 유튜브 채널 주소나 @핸들(예: @DistasteStudio)을 입력해주세요.</p>
                
                <form onSubmit={handleAddChannel} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newChannelInput}
                    onChange={(e) => setNewChannelInput(e.target.value)}
                    placeholder="https://youtube.com/@channel 또는 @핸들"
                    className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-blue/50 transition-colors placeholder:text-gray-600"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isAddingChannel}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neon-blue text-black font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isAddingChannel ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> 채널 등록</>}
                  </button>
                </form>
              </div>

              {/* Monitored Channels List */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 px-1">현재 모니터링 중인 채널 <span className="text-neon-blue">({channels.length})</span></h3>
                {channels.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 glass rounded-2xl border border-dashed border-white/10">등록된 자동 수집 채널이 없습니다.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map(channel => (
                      <div key={channel.id} className="glass rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between group">
                        <div 
                          className="flex items-center gap-4 flex-grow cursor-pointer"
                          onClick={() => fetchVideosForChannel(channel)}
                        >
                          <img src={channel.thumbnail_url} className="w-12 h-12 rounded-full border border-white/10 shadow-[0_0_10px_rgba(0,242,254,0.1)]" alt="" />
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-white truncate pr-2">{channel.title}</h4>
                            <p className="text-xs text-neon-blue truncate">{channel.channel_handle || channel.channel_id}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveChannel(channel.id, channel.title); }}
                          className="p-2 text-gray-500 hover:text-red-400 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="자동 수집 취소"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
