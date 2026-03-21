import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Reclassify all "No Dialogue" videos to "영어"
  const { data: before } = await supabase
    .from('videos')
    .select('youtube_id')
    .eq('language', 'No Dialogue');

  const count = before?.length || 0;

  if (count === 0) {
    return NextResponse.json({ message: "No 'No Dialogue' videos found. Nothing to do.", count: 0 });
  }

  const { error } = await supabase
    .from('videos')
    .update({ language: '영어' })
    .eq('language', 'No Dialogue');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Reclassified ${count} videos from "No Dialogue" → "영어"`, count });
}
