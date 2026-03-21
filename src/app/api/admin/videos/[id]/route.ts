import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Verify Admin Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "jumpingkor@gmail.com,mnibsi@gmail.com").split(",");

    if (!user || !user.email || !adminEmails.includes(user.email)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // 2. We must delete any bookmarks referencing this video first (Foreign Key constraint)
    const { error: bookmarksError } = await supabase
      .from("bookmarks")
      .delete()
      .eq("video_id", id);
      
    if (bookmarksError) {
      console.error("Failed to delete related bookmarks:", bookmarksError);
      return NextResponse.json({ error: "Failed to delete related bookmarks." }, { status: 500 });
    }

    // 3. Delete the video from videos table
    const { error: videoError } = await supabase
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
