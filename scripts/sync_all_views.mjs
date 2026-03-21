import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // or NEXT_PUBLIC_SUPABASE_ANON_KEY if RLS allows
const youtubeKey = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseKey || !youtubeKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all videos from Supabase...");
  // Fetch all videos to do a complete stat refresh
  const { data: videos, error } = await supabase.from('videos').select('youtube_id');
  
  if (error || !videos) {
    console.error("Failed to fetch videos from Supabase", error);
    process.exit(1);
  }

  const ids = videos.map(v => v.youtube_id);
  console.log(`Found ${ids.length} videos. Syncing in batches of 50...`);

  let updatedCount = 0;

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}&key=${youtubeKey}`;
    
    try {
      const res = await fetch(url);
      const ytData = await res.json();

      if (!ytData.items) {
        console.error("No items returned from YouTube API for this batch", ytData);
        continue;
      }

      for (const item of ytData.items) {
        const rawViewCount = parseInt(item.statistics.viewCount || "0", 10) || 0;
        const likeCount = parseInt(item.statistics.likeCount || "0", 10) || 0;
        const commentCount = parseInt(item.statistics.commentCount || "0", 10) || 0;
        
        // Re-calculate true engagement score
        const engagementScore = rawViewCount + (likeCount * 20) + (commentCount * 50);

        const { error: updateError } = await supabase
          .from('videos')
          .update({
            view_count: rawViewCount,
            like_count: likeCount,
            comment_count: commentCount,
            engagement_score: engagementScore
          })
          .eq('youtube_id', item.id);

        if (updateError) {
          console.error(`Error updating ${item.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      console.log(`Processed batch ${i / 50 + 1} / ${Math.ceil(ids.length / 50)}`);
    } catch (e) {
      console.error("Error fetching batch from YouTube", e);
    }
  }

  console.log(`Successfully updated stats for ${updatedCount} videos!`);
}

run();
