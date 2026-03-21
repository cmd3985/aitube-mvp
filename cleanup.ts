import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = env['YOUTUBE_API_KEY'] || "AIzaSyDI6God8EP2mVf6P9Tz7s4mbuDXzw2RIq4";

if (!SUPABASE_URL || !SUPABASE_KEY || !YOUTUBE_API_KEY) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Fetching all videos from Supabase...');
  const { data: videos, error } = await supabase.from('videos').select('youtube_id');
  if (error || !videos) {
    console.error('Error fetching vids:', error);
    return;
  }

  const videoIds = videos.map(v => v.youtube_id);
  console.log(`Found ${videoIds.length} videos. Checking YouTube embeddability...`);

  // YouTube API allows checking 50 IDs at a time
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  let deletedCount = 0;

  for (const chunk of chunks) {
    const idsParam = chunk.join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${idsParam}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) continue;

    for (const item of data.items) {
      if (item.status && item.status.embeddable === false) {
        console.log(`Deleting non-embeddable video: ${item.id}`);
        // First delete bookmarks to avoid foreign key issues
        await supabase.from('bookmarks').delete().eq('video_id', item.id);
        const { error: delError } = await supabase.from('videos').delete().eq('youtube_id', item.id);
        if (delError) {
          console.error(`Failed to delete ${item.id}:`, delError);
        } else {
          deletedCount++;
        }
      }
    }
    
    // Also check for videos that were in the DB but YouTube API returned no items for them (deleted from youtube)
    const returnedIds = new Set(data.items.map((item: any) => item.id));
    for (const id of chunk) {
      if (!returnedIds.has(id)) {
        console.log(`Deleting video that was removed from YouTube: ${id}`);
        await supabase.from('bookmarks').delete().eq('video_id', id);
        const { error: delError } = await supabase.from('videos').delete().eq('youtube_id', id);
        if (!delError) deletedCount++;
      }
    }
  }

  console.log(`Cleanup complete! Deleted a total of ${deletedCount} bad videos.`);
}

run();
