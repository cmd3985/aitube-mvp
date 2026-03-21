import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import sharp from 'sharp';

async function isPillarboxed(thumbnailUrl: string): Promise<boolean> {
  try {
    const res = await fetch(thumbnailUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buffer).resize(160, 90).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const edgeWidth = Math.floor(width * 0.12);
    let darkPixels = 0;
    let totalEdgePixels = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < edgeWidth; x++) {
        const idx = (y * width + x) * channels;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness < 30) darkPixels++;
        totalEdgePixels++;
      }
      for (let x = width - edgeWidth; x < width; x++) {
        const idx = (y * width + x) * channels;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness < 30) darkPixels++;
        totalEdgePixels++;
      }
    }
    return (darkPixels / totalEdgePixels) > 0.80;
  } catch {
    return false;
  }
}

export async function GET() {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('youtube_id, title, thumbnail_url');

  if (error || !videos) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const verticalIds: string[] = [];
  const verticalTitles: string[] = [];

  // Check each video's thumbnail
  for (const v of videos) {
    if (!v.thumbnail_url) continue;
    const isVertical = await isPillarboxed(v.thumbnail_url);
    if (isVertical) {
      verticalIds.push(v.youtube_id);
      verticalTitles.push(v.title);
      console.log(`[Pillarbox] Found: "${v.title}"`);
    }
  }

  if (verticalIds.length === 0) {
    return NextResponse.json({ message: "No pillarboxed vertical videos found.", deleted: 0, checked: videos.length });
  }

  const { error: delError } = await supabase
    .from('videos')
    .delete()
    .in('youtube_id', verticalIds);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Deleted ${verticalIds.length} pillarboxed vertical videos`,
    deleted: verticalIds.length,
    checked: videos.length,
    titles: verticalTitles
  });
}

export const maxDuration = 60; // Allow up to 60s for thumbnail analysis
