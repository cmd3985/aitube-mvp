import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = envEmails ? envEmails.split(",").map(e => e.trim()) : [];

    if (!user || !user.email || !adminEmails.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { error } = await adminClient
      .from("videos")
      .update({ status: 'published' })
      .eq("youtube_id", id);
      
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
