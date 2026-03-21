import { NextResponse } from "next/server";
import { fetchAIVideos } from "@/lib/youtube";
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
    console.log("Starting YouTube sync cron job...");
    
    const QUERIES = [
      { q: "AI short film", lang: "en" },
      { q: "AI movie", lang: "en" },
      { q: "court métrage IA", lang: "fr" },
      { q: "cortometraje de IA", lang: "es" },
      { q: "curta-metragem de IA", lang: "pt" },
      { q: "AI 영화", lang: "ko" },
      { q: "AI 웹드라마", lang: "ko" },
      { q: "AI 映画", lang: "ja" },
      { q: "AI 短片", lang: "zh" },
      { q: "AI लघु फिल्म", lang: "hi" },
    ];
    // pick one randomly
    const pick = QUERIES[Math.floor(Math.random() * QUERIES.length)];
    const rawVideos = await fetchAIVideos(pick.q, 40, pick.lang);
    
    // Categorize
    const allVideos = [];
    for (const v of rawVideos) {
      const getDurationSecs = (durStr: string) => {
        const parts = durStr.split(":").map(Number);
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        return parts[0]*60 + parts[1];
      };
      const durationSec = getDurationSecs(v.duration);
      
      // Core Text for Analysis
      const titleLower = v.title.toLowerCase();
      const descLower = v.description.toLowerCase();
      const fullText = (titleLower + " " + descLower);

      // --- STEP 1: Multi-lingual Blacklist (Drop, Cost 0) ---
      const blacklist = [
        "결말포함", "영화리뷰", "명작", "요약", "몰아보기", "스포", "평론", // KO
        "ending explained", "recap", "movie review", "explained", "summary", "reaction", "how to", "tutorial", // EN
        "ネタバレ", "レビュー", "結末", "解説", "要約", "反応", // JA
        "resumen", "reseña", "final explicado", "crítica", "résumé", "fin expliquée", "resumo", // ES/FR/PT
        "解说", "影评", "结局", "剧透", "समीक्षा", "स्पष्टीकरण" // ZH/HI
      ];
      
      const isBlacklisted = blacklist.some(p => fullText.includes(p));
      const channelLower = (v.channelTitle || "").toLowerCase();
      const channelIsReview = channelLower.includes("review") || channelLower.includes("recap") || channelLower.includes("리뷰");
      if (isBlacklisted || channelIsReview) {
        continue; // Drop video entirely
      }

      // --- STEP 2: Multi-lingual Whitelist (Fast-Pass, Cost 0) ---
      const whitelist = [
        "ai short film", "ai movie", "ai cinematic", "ai webdrama", "full ai film", "ai generated film",
        "ai 단편영화", "ai 영화", "ai 웹드라마", "ai 애니메이션", "ai 시네마",
        "ai短編映画", "ai映画", "aiアニメ", "ai生成動画", "フルai映画",
        "cortometraje ai", "cortometraje ia", "película ai", "película ia", "court métrage ia", "film ia", "curta-metragem ia", "filme ia",
        "ai短片", "ai电影", "ai微电影", "ai शॉर्ट फिल्म", "ai फिल्म"
      ];
      const isWhitelisted = whitelist.some(p => titleLower.includes(p) || descLower.includes(p));

      // --- STEP 3: LLM Grey Area Check (Cost) ---
      if (!isWhitelisted) {
        // If not explicitly whitelisted, check with LLM
        if (process.env.OPENAI_API_KEY) {
          try {
            const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { 
                    role: "system", 
                    content: "당신은 영상 판별 전문가입니다. 제목과 설명을 보고, 이 영상이 오직 생성형 AI 툴(Midjourney, Runway, Veo, Sora 등)로 직접 제작된 영상물인지 판별하세요. 기존 상업 영화(A.I., 아이로봇 등)의 리뷰, 다큐, 뉴스라면 무조건 ABOUT-AI로 답하세요. 직접 AI로 만든 창작물만 MADE-WITH-AI로 대답하세요." 
                  },
                  { role: "user", content: `제목: ${v.title}\n설명: ${v.description}` }
                ],
                max_tokens: 10,
                temperature: 0
              })
            });
            const llmData = await llmRes.json();
            const answer = llmData.choices?.[0]?.message?.content?.trim();
            if (answer !== "MADE-WITH-AI") {
              continue; // Drop if LLM says it's not made with AI
            }
          } catch(e) {
            console.error("LLM Verification Error:", e);
            continue; // Safely drop if API fails
          }
        } else {
          // If no OpenAI key is set, we can either drop or pass. 
          // Drop it to keep MVP quality strict as requested.
          continue; 
        }
      }

      // Consolidated Category
      let category = "Cinema"; // Replaces legacy Movie/Drama distinction

      // Language Inference
      const detector = new LanguageDetect();
      let language = "영어"; // default
      
      if (fullText.includes("no dialogue") || fullText.includes("silent") || fullText.includes("bgm") || fullText.includes("music only")) {
        language = "No Dialogue";
      } else {
        // CJK Regex Fast-Path (LanguageDetect struggles with CJK)
        if (/[가-힣]/.test(fullText)) {
          language = "한국어";
        } else if (/[ぁ-んァ-ン]/.test(fullText)) {
          language = "일본어";
        } else if (/[\u4e00-\u9fa5]/.test(fullText)) {
          language = "중국어";
        } else if (/[\u0900-\u097F]/.test(fullText)) {
          language = "힌디어";
        } else {
          // Use LanguageDetect for Latin-based languages
          const detected = detector.detect(fullText, 3); // top 3
          if (detected.length > 0) {
            const topLang = detected[0][0]; // e.g. "english", "french", "spanish"
            if (topLang === 'french') language = "프랑스어";
            else if (topLang === 'spanish') language = "스페인어";
            else if (topLang === 'portuguese') language = "포르투갈어";
            else language = "영어"; 
          }
        }
      }

      allVideos.push({ ...v, category, language });
    }

    let upsertedCount = 0;
    let firstError = null;

    for (const video of allVideos) {
      const textForTags = (video.title + " " + video.description).toLowerCase();
      const tools = [];
      if (textForTags.includes("veo")) tools.push("Veo");
      if (textForTags.includes("pika")) tools.push("Pika");
      if (textForTags.includes("seedream")) tools.push("Seedream");
      if (textForTags.includes("flux")) tools.push("FLUX");
      if (textForTags.includes("midjourney")) tools.push("Midjourney");
      
      const viewCountInt = parseInt(video.views.replace(/\D/g, "")) || 0;

      const { error: upsertError } = await supabase
        .from("videos")
        .upsert({
          youtube_id: video.id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail,
          duration: video.duration,
          view_count: viewCountInt,
          category: video.category,
          published_at: video.uploadedAt,
          ai_tool_tags: tools,
          channel_title: video.channelTitle,
          language: video.language,
        }, { onConflict: "youtube_id" });

      if (upsertError) {
        console.error(`Error upserting video ${video.id}:`, upsertError);
        if (!firstError) firstError = upsertError;
      } else {
        upsertedCount++;
      }
    }

    const moviesFound = allVideos.filter(v => v.category === "Movie").length;
    const dramasFound = allVideos.filter(v => v.category === "Drama").length;

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${upsertedCount} videos.`,
      debug: {
        moviesFound,
        dramasFound,
        totalAttempted: allVideos.length,
        supabaseError: firstError
      }
    });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
