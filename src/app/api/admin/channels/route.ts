import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  try {
    const adminClient = getAdminClient();
    const { data: channels, error } = await adminClient
      .from('monitored_channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty
        return NextResponse.json({ channels: [] });
      }
      throw error;
    }
    return NextResponse.json({ channels: channels || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminClient = getAdminClient();
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";
    
    const { input } = await req.json();
    if (!input) return NextResponse.json({ error: 'YouTube channel URL or handle is required' }, { status: 400 });

    // Determine if input is Handle (@), Channel ID (UC...), or URL
    let ytQuery = '';
    let isHandle = false;

    if (input.includes('@')) {
      const match = input.match(/@([\w.-]+)/);
      if (match) {
        ytQuery = `forHandle=@${match[1]}`;
        isHandle = true;
      }
    } else if (input.includes('channel/UC')) {
      const match = input.match(/channel\/(UC[\w-]+)/);
      if (match) ytQuery = `id=${match[1]}`;
    } else if (input.startsWith('UC') && input.length === 24) {
      ytQuery = `id=${input}`;
    } else {
      // Fallback: search by username
      ytQuery = `forUsername=${input.split('/').pop()}`;
    }

    if (!ytQuery) {
      return NextResponse.json({ error: 'Invalid channel format. Please use a YouTube @handle, Channel ID, or URL.' }, { status: 400 });
    }

    // Fetch Channel info from YouTube API
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&${ytQuery}&key=${YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();

    if (!ytRes.ok) {
        console.error("YouTube API Error:", ytData);
        return NextResponse.json({ error: `YouTube API Error: ${ytData.error?.message || "Unknown error"}` }, { status: ytRes.status });
    }

    if (!ytData.items || ytData.items.length === 0) {
      return NextResponse.json({ error: 'YouTube channel not found. Please verify the URL or handle.' }, { status: 404 });
    }

    const channelItem = ytData.items[0];
    const channelData = {
      channel_id: channelItem.id,
      channel_handle: channelItem.snippet.customUrl || null,
      title: channelItem.snippet.title,
      thumbnail_url: channelItem.snippet.thumbnails?.high?.url || channelItem.snippet.thumbnails?.default?.url || null,
    };

    // Insert into Supabase
    const { data, error } = await adminClient
      .from('monitored_channels')
      .insert([channelData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, channel: data });
  } catch (error: any) {
    console.error('Channel Registration Error:', error);
    // Unique violation
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This channel is already being monitored.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
