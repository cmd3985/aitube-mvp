import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Verify Admin Auth using normal client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = envEmails ? envEmails.split(",").map(e => e.trim()) : [];

    if (!user || !user.email || !adminEmails.includes(user.email)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // 2. Create Admin Client with Service Role Key to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 3. We must delete any bookmarks referencing this video first (Foreign Key constraint)
    const { error: bookmarksError } = await adminClient
      .from("bookmarks")
      .delete()
      .eq("video_id", id);
      
    if (bookmarksError) {
      console.error("Failed to delete related bookmarks:", bookmarksError);
      return NextResponse.json({ error: "Failed to delete related bookmarks." }, { status: 500 });
    }

    // 4. Delete the video from videos table
    const { error: videoError } = await adminClient
      .from("videos")
      .delete()
      .eq("youtube_id", id);

      
    if (videoError) {
      console.error("Failed to delete video:", videoError);
      return NextResponse.json({ error: "Failed to delete video." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Video ${id} deleted successfully.` });
  } catch (error: any) {
    console.error("Delete video API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
