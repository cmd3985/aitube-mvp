import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Max duration for Vercel

export async function GET(req: Request) {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data, error } = await adminClient.from('videos').select('*');
    if (error) throw error;


    
    const blacklist = [
      "결말포함", "영화리뷰", "명작", "요약", "몰아보기", "스포", "평론", "후기", "리뷰", "수상 소감", "메이킹", "비하인드", "튜토리얼", "강의", "만드는 법", "만드는법", "제작기", "제작 과정", "제작과정", "노하우", "꿀팁", "팁", "강좌", "가이드", "수익창출", "돈 버는", "돈버는", "부업", "클래스", "사용법", "활용법", "기초", "입문", "추천", "소개", "플랫폼", "사이트", "공모전", "만들기", "방법", "도구", "무료", "수업", "단계", "테스트", "활용", "방법", "툴", "촬영 감독", "메이크업", "안무가", "스타일리스트", "뮤직비디오", // KO
      "ending explained", "recap", "movie review", "explained", "summary", "reaction", "how to", "tutorial", "vlog", "behind the scenes", "making of", "review", "tips", "guide", "course", "workflow", "how i made", "how i make", "process", "make money", "passive income", "bts", "best ai", "top 10", "free tool", "software", "platform", "website", "beginner", "introduction", "basics", "step by step", "steps", "demo", "promt", "prompt", "cameraman", "make-up", "makeup", "choreography", "playback singer", "child artist", "costume designer", "music label", "official music video", "official trailer", "star cast", "starring:", "staring ", "starring ", "cast:", "cast -", "dop :", "dop -", "production house", "all rights reserved", "music director", "singer -", "singer :", "label :", "label -", "dubbed movie", "bhojpuri movie", "haryanvi movie", "punjabi movie", "south movie", "new hindi movie", "full hd movie", "artists -", "artists :", "buy link", "meesho.com", "amazon.com", // EN
      "ネタバレ", "レビュー", "結末", "解説", "要約", "反応", "作り方", "メイキング", "ヒント", "裏側", "稼ぎ方", "講座", // JA
      "resumen", "reseña", "final explicado", "crítica", "résumé", "fin expliquée", "resumo", "tutorial", "cómo hacer", "consejos", "trucos", "detrás de cámaras", "tutoriel", "tuto", "coulisses", "astuces", "dicas", "como fazer", // ES/FR/PT
      "解说", "影评", "结局", "剧透", "解說", "影評", "스포일러", "समीक्षा", "स्पष्टीकरण", "教程", "幕后", "技巧", "赚钱", "怎么做", "ट्यूटोरियल", "सुझाव", // ZH/HI
      "مراجعة فيلم", "نهاية مشروحة", "الجزء", "ملخص", "شرح", "كيف تصنع", "نصائح", "دورة", // AR
      "ulasan film", "penjelasan akhir", "alur cerita", "tutorial", "cara membuat", "tips", // ID
      "обзор фильма", "концовка объяснение", "краткий пересказ", "объяснение", "туториал", "как сделать", "советы", // RU
      "filmkritik", "ende erklärt", "zusammenfassung", "erklärung", "tutorial", "tipps", "wie man", "hinter den kulissen" // DE
    ];

    let deletedCount = 0;
    const deletedVideos = [];

    for (const v of data) {
      const fullText = ((v.title || "") + " " + (v.description || "")).toLowerCase();
      const isBlacklisted = blacklist.some(p => fullText.includes(p));
      
      const channelLower = (v.channel_title || "").toLowerCase();
      const channelIsReview = channelLower.includes("review") || channelLower.includes("recap") || channelLower.includes("리뷰");
      
      if (isBlacklisted || channelIsReview) {
        await adminClient.from('bookmarks').delete().eq('video_id', v.id);
        await adminClient.from('videos').delete().eq('id', v.id);
        deletedCount++;
        deletedVideos.push(v.title);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `청소 완료! 총 ${deletedCount}개의 브이로그/리뷰 영상을 삭제했습니다.`,
      deleted: deletedVideos
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
