import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseDuration } from '@/lib/youtube';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    // Extract video ID
    let videoId = "";
    try {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get("v") || "";
      if (!videoId && urlObj.hostname === "youtu.be") {
        videoId = urlObj.pathname.slice(1);
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' }, { status: 400 });
    }

    // Check if already in DB
    const { data: existing } = await supabase.from('videos').select('youtube_id').eq('youtube_id', videoId).single();
    if (existing) {
      return NextResponse.json({ error: 'This video has already been submitted to GenCine.' }, { status: 400 });
    }

    // Fetch YT metadata directly
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics,status&key=${YOUTUBE_API_KEY}`, {
      headers: { 'Referer': 'https://gencine.org/' }
    });
    const ytData = await ytRes.json();
    
    if (!ytData.items || ytData.items.length === 0) {
      return NextResponse.json({ error: 'Video not found. Ensure it is public and not deleted.' }, { status: 404 });
    }
    
    const item = ytData.items[0];
    
    // Reject if not embeddable
    if (item.status && item.status.embeddable === false) {
      return NextResponse.json({ error: 'This video does not allow embedding on other websites. Please enable embedding in YouTube settings.' }, { status: 400 });
    }
    const snippet = item.snippet;
    const stats = item.statistics;
    const content = item.contentDetails;
    
    // Parse values
    const viewCount = parseInt(stats.viewCount || "0");
    const likeCount = parseInt(stats.likeCount || "0");
    const commentCount = parseInt(stats.commentCount || "0");
    const durationFormatted = parseDuration(content.duration);
    
    // Determine language from snippet or default to Unknown
    const language = snippet.defaultAudioLanguage || snippet.defaultLanguage || "Unknown";
    
    // Calculate engagement score exactly as in cron job
    const engagementScore = (likeCount * 2) + commentCount + Math.floor(viewCount / 100);

    const { error: dbError } = await supabase.from('videos').insert({
      youtube_id: videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      channel_title: snippet.channelTitle,
      published_at: snippet.publishedAt,
      views: viewCount,
      likes: likeCount,
      comment_count: commentCount,
      duration: durationFormatted,
      language: language,
      tags: snippet.tags || [],
      engagement_score: engagementScore,
      status: 'pending',
      submitter_id: user.id
    });

    if (dbError) {
      console.error("DB Insert Error:", dbError);
      return NextResponse.json({ error: 'Failed to save submission to database.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submit API Error:", error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
