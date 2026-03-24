import { NextResponse } from "next/server";
import { fetchChannelLatestVideos } from "@/lib/youtube";
import { supabase } from "@/lib/supabase";
import LanguageDetect from 'languagedetect';

export const maxDuration = 60; // Max duration for Vercel Cron

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  
/* 
  const secret = process.env.CRON_SECRET;
  const isAuthorized = !secret || 
                       authHeader === `Bearer ${secret}` || 
                       keyParam === secret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
*/

  try {
    console.log("Starting Auto-Channel Fetch Pipeline...");
    
    // 1. Get all documented channels
    const { data: channels, error: channelsError } = await supabase
      .from('monitored_channels')
      .select('id, channel_id, channel_handle, title');
      
    if (channelsError && channelsError.code !== '42P01') {
      throw channelsError;
    }
    
    if (!channels || channels.length === 0) {
      return NextResponse.json({ success: true, message: "No registered channels to monitor." });
    }

    const detector = new LanguageDetect();
    let totalUpserted = 0;

    // 2. Loop through each channel and grab latest uploads
    for (const channel of channels) {
      console.log(`Fetching latest for channel: ${channel.title} (${channel.channel_id})`);
      const rawVideos = await fetchChannelLatestVideos(channel.channel_id, 10);
      
      const processedVideos = [];
      for (const v of rawVideos) {
        
        // Skip underperforming videos unless the channel is fully vetted, but since these are manually added supervisor channels, we permit all structural videos avoiding shorts!
        // We will just calculate language / tools here.

        const titleLower = v.title.toLowerCase();
        const descLower = v.description.toLowerCase();
        const fullText = (titleLower + " " + descLower);

        // Calculate language
        let language = "영어"; // default
        const getLatinScore = (regex: RegExp) => {
          const m = fullText.match(regex);
          return m ? m.length : 0;
        };
        const getNonLatinScore = (regex: RegExp) => {
          const m = fullText.match(regex);
          return m ? m.length * 3 : 0; 
        };

        const kanaScore = getNonLatinScore(/[\u3040-\u309F\u30A0-\u30FF]/g);
        const kanjiScore = getNonLatinScore(/[\u4E00-\u9FAF]/g);

        if (fullText.trim().length > 0 && !(kanaScore === 0 && kanjiScore > 0)) {
          const scores = {
            "한국어": getNonLatinScore(/[가-힣]/g),
            "일본어": kanaScore + (kanaScore > 0 ? kanjiScore : 0),
            "중국어": kanjiScore,
            "힌디어": getNonLatinScore(/[\u0900-\u097F]/g),
            "아랍어": getNonLatinScore(/[\u0600-\u06FF]/g),
            "러시아어": getNonLatinScore(/[а-яА-ЯёЁ]/g),
            "latin": getLatinScore(/[a-zA-Z]/g)
          };
          const maxScript = Object.keys(scores).reduce((a, b) => scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b);
          if (maxScript !== "latin" && scores[maxScript as keyof typeof scores] > 10) {
            language = maxScript;
          } else {
            const detected = detector.detect(fullText, 3);
            if (detected.length > 0) {
              const topLang = detected[0][0];
              if (topLang === 'french') language = "프랑스어";
              else if (topLang === 'spanish') language = "스페인어";
              else if (topLang === 'portuguese') language = "포르투갈어";
              else if (topLang === 'german') language = "독일어";
              else if (topLang === 'indonesian' || topLang === 'malay') language = "인도네시아어";
            }
          }
        }

        const engagementScore = v.rawViewCount + (v.likeCount * 20) + (v.commentCount * 50);

        processedVideos.push({ ...v, language, engagementScore });
      }

      // Upsert into Supabase (status = 'published')
      for (const video of processedVideos) {
        const textForTags = (video.title + " " + video.description).toLowerCase();
        const tools = [];
        if (textForTags.includes("veo")) tools.push("Veo");
        if (textForTags.includes("pika")) tools.push("Pika");
        if (textForTags.includes("seedream")) tools.push("Seedream");
        if (textForTags.includes("flux")) tools.push("FLUX");
        if (textForTags.includes("midjourney")) tools.push("Midjourney");
        if (textForTags.includes("runway") || textForTags.includes("gen-3")) tools.push("Runway");
        if (textForTags.includes("haiper")) tools.push("Haiper");
        if (textForTags.includes("kling")) tools.push("Kling");

        const { error: upsertError } = await supabase
          .from("videos")
          .upsert({
            youtube_id: video.id,
            title: video.title,
            description: video.description,
            thumbnail_url: video.thumbnail,
            duration: video.duration,
            view_count: video.rawViewCount,
            category: "AI", // Override category inherently
            published_at: new Date().toISOString(), // Use current ingest time for sorting placement, or video uploaded date (but /videos API endpoint takes published_at from our schema as sort)
            ai_tool_tags: tools,
            channel_title: video.channelTitle,
            language: video.language,
            like_count: video.likeCount,
            comment_count: video.commentCount,
            engagement_score: video.engagementScore,
            is_cc: video.is_cc,
            status: "published" // CRITICAL BYPASS
          }, { onConflict: "youtube_id" });

        if (!upsertError) totalUpserted++;
      }
      
      // Update last fetched timestamp
      await supabase.from('monitored_channels').update({ last_fetched_at: new Date().toISOString() }).eq('id', channel.id);
    }

    return NextResponse.json({ 
      success: true, 
      processed_channels: channels.length,
      auto_published_videos: totalUpserted,
      message: "Cron completed successfully"
    });

  } catch (err: any) {
    console.error("Auto-fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
