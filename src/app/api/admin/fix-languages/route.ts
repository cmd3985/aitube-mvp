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
      if (/[가-힣]/.test(fullText)) {
        newLang = "한국어";
      } else if (/[ぁ-んァ-ン]/.test(fullText)) {
        newLang = "일본어";
      } else if (/[\u4e00-\u9fa5]/.test(fullText)) {
        newLang = "중국어";
      } else if (/[\u0900-\u097F]/.test(fullText)) {
        newLang = "힌디어";
      } else if (/[\u0600-\u06FF]/.test(fullText)) {
        newLang = "아랍어";
      } else if (/[а-яА-ЯёЁ]/.test(fullText)) {
        newLang = "러시아어";
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
