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
      const getScore = (regex: RegExp) => ((v.title || "").match(regex) || []).length * 5 + ((v.description || "").match(regex) || []).length;
      
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
