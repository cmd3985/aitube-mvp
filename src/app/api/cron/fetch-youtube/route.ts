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
      { q: "AI short film", lang: "en", region: "US" },
      { q: "AI movie", lang: "en", region: "US" },
      { q: "court métrage IA", lang: "fr", region: "FR" },
      { q: "cortometraje de IA", lang: "es", region: "ES" },
      { q: "curta-metragem de IA", lang: "pt", region: "BR" },
      { q: "AI 영화", lang: "ko", region: "KR" },
      { q: "AI 웹드라마", lang: "ko", region: "KR" },
      { q: "AI 映画", lang: "ja", region: "JP" },
      { q: "AI短片", lang: "zh", region: "TW" },
      { q: "AI微电影", lang: "zh", region: "HK" },
      { q: "AI生成视频", lang: "zh", region: "TW" },
      { q: "AI शॉर्ट फिल्म", lang: "hi", region: "IN" },
      { q: "AI फिल्म", lang: "hi", region: "IN" },
      { q: "فيلم قصير بالذكاء الاصطناعي", lang: "ar", region: "AE" },
      { q: "فيلم ذكاء اصطناعي", lang: "ar", region: "AE" },
      { q: "film pendek AI", lang: "id", region: "ID" },
      { q: "film AI", lang: "id", region: "ID" },
      { q: "ИИ короткометражный фильм", lang: "ru", region: "RU" },
      { q: "ИИ фильм", lang: "ru", region: "RU" },
      { q: "KI Kurzfilm", lang: "de", region: "DE" },
      { q: "KI Film", lang: "de", region: "DE" },
    ];
    // Shuffle queries and pick 5 to execute concurrently
    const shuffled = QUERIES.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    
    // Maintain a healthy mix of top relevancy and brand new sorting
    const orders: ("relevance" | "date" | "viewCount")[] = ["relevance", "relevance", "viewCount", "date", "date"];
    
    const results = await Promise.all(
      selected.map((pick, i) => fetchAIVideos(pick.q, 50, pick.lang, orders[i], pick.region))
    );
    
    const rawVideos = results.flat();

    // Deduplicate fetched videos by YouTube ID
    const uniqueMap = new Map();
    for (const v of rawVideos) {
      if (!uniqueMap.has(v.id)) uniqueMap.set(v.id, v);
    }
    const uniqueRawVideos = Array.from(uniqueMap.values());
    
    // Categorize
    const allVideos = [];
    for (const v of uniqueRawVideos) {
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

      // --- STEP 0: Quality Control (QC) Defense ---
      // Requirement: Drop if views < 1000 AND likes < 50
      if (v.rawViewCount < 1000 && v.likeCount < 50) {
        continue; // Immediate discard
      }

      // Compute Engagement Score
      const engagementScore = v.rawViewCount + (v.likeCount * 20) + (v.commentCount * 50);

      // --- STEP 1: Multi-lingual Blacklist (Drop, Cost 0) ---
      const blacklist = [
        "결말포함", "영화리뷰", "명작", "요약", "몰아보기", "스포", "평론", "후기", "리뷰", "수상 소감", "메이킹", "비하인드", "튜토리얼", "강의", "만드는 법", "만드는법", "제작기", "제작 과정", "제작과정", "노하우", "꿀팁", "팁", "강좌", "가이드", "수익창출", "돈 버는", "돈버는", "부업", "클래스", // KO
        "ending explained", "recap", "movie review", "explained", "summary", "reaction", "how to", "tutorial", "vlog", "behind the scenes", "making of", "review", "tips", "guide", "course", "workflow", "how i made", "how i make", "process", "make money", "passive income", "bts", // EN
        "ネタバレ", "レビュー", "結末", "解説", "要約", "反応", "作り方", "メイキング", // JA
        "resumen", "reseña", "final explicado", "crítica", "résumé", "fin expliquée", "resumo", "tutorial", "cómo hacer", // ES/FR/PT
        "解说", "影评", "结局", "剧透", "解說", "影評", "스포일러", "समीक्षा", "स्पष्टीकरण", "教程", "幕后", // ZH/HI/KO
        "مراجعة فيلم", "نهاية مشروحة", "الجزء", "ملخص", "شرح", // AR
        "ulasan film", "penjelasan akhir", "alur cerita", "tutorial", // ID
        "обзор фильма", "концовка объяснение", "краткий пересказ", "объяснение", "туториал", // RU
        "filmkritik", "ende erklärt", "zusammenfassung", "erklärung", "tutorial" // DE
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
        "ai短片", "ai电影", "ai微电影", "ai生成视频", "ai 微電影", "ai 生成視頻", "ai शॉर्ट फिल्म", "ai फिल्म",
        "فيلم قصير بالذكاء الاصطناعي", "فيلم ذكاء اصطناعي",
        "film pendek ai", "film ai",
        "ии короткометражный фильм", "ии фильм", "ki kurzfilm", "ki film"
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

      // Language Inference (No Dialogue videos now fall through to normal detection)
      const detector = new LanguageDetect();
      let language = "영어"; // default
      
      {
        // Alphabet Regex Fast-Paths (LanguageDetect struggles with non-Latin scripts)
        if (/[가-힣]/.test(fullText)) {
          language = "한국어";
        } else if (/[ぁ-んァ-ン]/.test(fullText)) {
          language = "일본어";
        } else if (/[\u4e00-\u9fa5]/.test(fullText)) {
          language = "중국어";
        } else if (/[\u0900-\u097F]/.test(fullText)) {
          language = "힌디어";
        } else if (/[\u0600-\u06FF]/.test(fullText)) {
          language = "아랍어";
        } else if (/[а-яА-ЯёЁ]/.test(fullText)) {
          language = "러시아어";
        } else {
          // Use LanguageDetect for Latin-based languages
          const detected = detector.detect(fullText, 3); // top 3
          if (detected.length > 0) {
            const topLang = detected[0][0]; // e.g. "english", "french", "spanish"
            if (topLang === 'french') language = "프랑스어";
            else if (topLang === 'spanish') language = "스페인어";
            else if (topLang === 'portuguese') language = "포르투갈어";
            else if (topLang === 'german') language = "독일어";
            else if (topLang === 'indonesian' || topLang === 'malay') language = "인도네시아어";
            else language = "영어"; 
          }
        }
      }

      allVideos.push({ ...v, category, language, engagementScore });
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
      
      const { error: upsertError } = await supabase
        .from("videos")
        .upsert({
          youtube_id: video.id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail,
          duration: video.duration,
          view_count: video.rawViewCount,
          category: video.category,
          published_at: video.uploadedAt,
          ai_tool_tags: tools,
          channel_title: video.channelTitle,
          language: video.language,
          like_count: video.likeCount,
          comment_count: video.commentCount,
          engagement_score: video.engagementScore,
        }, { onConflict: "youtube_id" });

      if (upsertError) {
        console.error(`Error upserting video ${video.id}:`, upsertError);
        if (!firstError) firstError = upsertError;
      } else {
        upsertedCount++;
      }
    }

    const cinemaFound = allVideos.filter(v => v.category === "Cinema").length;

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${upsertedCount} videos.`,
      debug: {
        cinemaFound,
        rawFetched: uniqueRawVideos.length,
        qcPassed: allVideos.length,
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
