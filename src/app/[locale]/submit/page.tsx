"use client";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { createClient } from "@/utils/supabase/client";
import { Send, Youtube, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SubmitPage() {
  const { t, lang } = useLanguage();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please log in to submit a video. Look for the Google login button in the navigation bar.");
      // You could also open the login modal here, but an error message is sufficient for this flow
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit video");
      
      setSuccess(true);
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex justify-center items-center px-4 py-20 relative">
      <div className="max-w-xl w-full glass p-8 sm:p-12 rounded-3xl border border-neon-purple/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden backdrop-blur-xl">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-blue/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-neon-purple to-neon-blue p-[2px] mb-8 shadow-[0_0_30px_rgba(0,242,254,0.3)]">
            <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center">
              <Youtube className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight">
            {t("submitFilm")}
          </h1>
          <p className="text-gray-400 mb-10 max-w-sm text-sm leading-relaxed">
            Showcase your hidden AI masterpiece to the global audience. Approvals usually take 24-48 hours.
          </p>

          {success ? (
            <div className="w-full p-8 mt-2 rounded-2xl bg-green-500/10 border border-green-500/30 text-center animate-in fade-in zoom-in duration-500">
              <h3 className="text-green-400 font-bold text-xl mb-3">Submission Successful! 🎉</h3>
              <p className="text-sm text-green-200/80 mb-8 max-w-xs mx-auto">Your film is now pending review. The admin team will process it shortly.</p>
              <div className="flex gap-4 justify-center">
                <Link href={`/${lang.toLowerCase()}`} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors font-medium text-sm">
                  Go Home
                </Link>
                <button onClick={() => setSuccess(false)} className="px-6 py-2.5 rounded-xl bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors font-medium text-sm">
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
              <div className="relative group">
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full !bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all font-mono text-sm shadow-inner"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-left font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !url}
                className="group relative w-full flex items-center justify-center gap-3 bg-white text-black font-extrabold text-lg py-5 rounded-2xl mt-4 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed overflow-hidden active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">{loading ? "Submitting..." : t("submitFilm")}</span>
                {!loading && <Send className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
