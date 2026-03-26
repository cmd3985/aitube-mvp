import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// One-shot cleanup: delete all videos classified as 힌디어 (Hindi) from the DB
export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("videos")
      .delete()
      .eq("language", "힌디어")
      .select("youtube_id");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted_count: data?.length ?? 0,
      message: `Successfully removed ${data?.length ?? 0} Hindi-language videos.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
