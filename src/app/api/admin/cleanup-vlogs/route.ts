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
      "결말포함", "영화리뷰", "명작", "요약", "몰아보기", "스포", "평론", "후기", "리뷰", "수상 소감", "메이킹", "비하인드", "튜토리얼", "강의", "만드는 법", "만드는법",
      "ending explained", "recap", "movie review", "explained", "summary", "reaction", "how to", "tutorial", "vlog", "behind the scenes", "making of", "review",
      "ネタバレ", "レビュー", "結末", "解説", "要約", "反応", "作り方", "メイキング",
      "resumen", "reseña", "final explicado", "crítica", "résumé", "fin expliquée", "resumo", "tutorial", "cómo hacer",
      "解说", "影评", "结局", "剧透", "解說", "影評", "스포일러", "समीक्षा", "स्पष्टीकरण", "教程", "幕后",
      "مراجعة فيلم", "نهاية مشروحة", "الجزء", "ملخص", "شرح",
      "ulasan film", "penjelasan akhir", "alur cerita", "tutorial",
      "обзор фильма", "концовка объяснение", "краткий пересказ", "объяснение", "туториал",
      "filmkritik", "ende erklärt", "zusammenfassung", "erklärung", "tutorial"
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
