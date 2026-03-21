-- Supabase SQL Editor에 아래 쿼리를 복사하여 붙여넣고 RUN 버튼을 눌러주세요.

CREATE TABLE public.videos (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    view_count BIGINT DEFAULT 0,
    published_at TEXT,
    category TEXT NOT NULL, -- 'Movie' or 'Drama'
    ai_tool_tags TEXT[], -- Array of strings (e.g. ['Veo', 'Pika'])
    channel_title TEXT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
-- 프론트엔드에서 데이터를 읽을 수만 있도록 활성화합니다.
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 익명 사용자(프론트엔드)가 SELECT 할 수 있도록 정책 추가
CREATE POLICY "Public profiles are viewable by everyone."
ON public.videos FOR SELECT
USING ( true );

-- (선택) 데이터베이스의 view_count 숫자 업데이트나 삽입은, 서버 사이드(Cron Job)의 Service Role Key를 사용하므로
-- 위와 같이 Select 정책만 있어도 충분합니다!

-- =========== [마이그레이션 안내] ===========
-- 기존 테이블이 있다면 아래 쿼리를 추가로 실행해서 컬럼을 추가해주세요!
-- ALTER TABLE public.videos ADD COLUMN channel_title TEXT DEFAULT 'Unknown';
-- ALTER TABLE public.videos ADD COLUMN language TEXT DEFAULT 'Unknown';

-- =========== [마이그레이션 안내 2 - Engagement Update] ===========
-- 프리미엄 QC 및 인게이지먼트 점수 산정을 위한 신규 컬럼 추가 및 클렌징
-- ALTER TABLE public.videos ADD COLUMN like_count INTEGER DEFAULT 0;
-- ALTER TABLE public.videos ADD COLUMN comment_count INTEGER DEFAULT 0;
-- ALTER TABLE public.videos ADD COLUMN engagement_score INTEGER DEFAULT 0;

-- -- 기존 저퀄리티 데이터 클렌징 쿼리 (조회수 1000 미만 & 좋아요 50 미만)
-- DELETE FROM public.videos WHERE view_count < 1000 AND (like_count IS NULL OR like_count < 50);
