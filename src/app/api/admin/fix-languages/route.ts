import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import LanguageDetect from 'languagedetect';

export const maxDuration = 60; // Max duration for Vercel

export async function GET(req: Request) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data: videos, error } = await adminClient.from('videos').select('id, title, description, language');
    if (error || !videos) return NextResponse.json({ error: 'Failed to fetch videos' });

    const detector = new LanguageDetect();
    let updatedCount = 0;
    const errors = [];

    for (const v of videos) {
      const titleLower = v.title?.toLowerCase() || "";
      const descLower = v.description?.toLowerCase() || "";
      const fullText = (titleLower + " " + descLower);

      let newLang = "영어"; // default
      // Increase title multiplier to 100 to ensure titles heavily dictate the primary language despite massive English descriptions.
      const getScore = (regex: RegExp) => ((v.title || "").match(regex) || []).length * 100 + ((v.description || "").match(regex) || []).length;
      
      const blacklist = [
      "결말포함", "영화리뷰", "명작", "요약", "몰아보기", "스포", "평론", "후기", "리뷰", "수상 소감", "메이킹", "비하인드", "튜토리얼", "강의", "만드는 법", "만드는법", "제작기", "제작 과정", "제작과정", "노하우", "꿀팁", "팁", "강좌", "가이드", "수익창출", "돈 버는", "돈버는", "부업", "클래스", "사용법", "활용법", "기초", "입문", "추천", "소개", "플랫폼", "사이트", "공모전", "만들기", "방법", "도구", "무료", "수업", "단계", "테스트", "활용", "방법", "툴", "촬영 감독", "메이크업", "안무가", "스타일리스트", "뮤직비디오", // KO
      "ending explained", "recap", "movie review", "explained", "summary", "reaction", "how to", "tutorial", "vlog", "behind the scenes", "making of", "review", "tips", "guide", "course", "workflow", "how i made", "how i make", "process", "make money", "passive income", "bts", "best ai", "top 10", "free tool", "software", "platform", "website", "beginner", "introduction", "basics", "step by step", "steps", "demo", "promt", "prompt", "cameraman", "make-up", "makeup", "choreography", "playback singer", "child artist", "costume designer", "music label", "official music video", "official trailer", "star cast", "starring:", "dop :", "dop -", "production house", "all rights reserved", "music director", "singer -", "singer :", "label :", "label -", "dubbed movie", "bhojpuri movie", "haryanvi movie", "punjabi movie", "south movie", "new hindi movie", "full hd movie", "artists -", "artists :", "buy link", "meesho.com", "amazon.com", // EN
      ];

      const scores = {
        "한국어": getScore(/[가-힣]/g),
        "일본어": getScore(/[ぁ-んァ-ン]/g),
        "중국어": getScore(/[\u4e00-\u9fa5]/g),
        "힌디어": getScore(/[\u0900-\u097F]/g),
        "아랍어": getScore(/[\u0600-\u06FF]/g),
        "러시아어": getScore(/[а-яА-ЯёЁ]/g),
        "latin": getScore(/[a-zA-Z]/g)
      };

      const maxScript = Object.keys(scores).reduce((a, b) => scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b);

      if (maxScript !== "latin" && scores[maxScript as keyof typeof scores] > 10) {
        newLang = maxScript;
      } else {
        const detected = detector.detect(fullText, 3);
        if (detected.length > 0) {
          const topLang = detected[0][0];
          if (topLang === 'french') newLang = "프랑스어";
          else if (topLang === 'spanish') newLang = "스페인어";
          else if (topLang === 'portuguese') newLang = "포르투갈어";
          else if (topLang === 'german') newLang = "독일어";
          else if (topLang === 'indonesian' || topLang === 'malay') newLang = "인도네시아어";
        }
      }

      if (v.language !== newLang) {
        const { error: updateError } = await adminClient
          .from('videos')
          .update({ language: newLang })
          .eq('id', v.id);
          
        if (!updateError) {
          updatedCount++;
        } else {
          errors.push(updateError);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `언어 재분류 완료! 총 ${updatedCount}개의 영상 언어가 새롭게 수정되었습니다.`,
      debug: {
        totalTarget: videos.length,
        errors
      }
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
