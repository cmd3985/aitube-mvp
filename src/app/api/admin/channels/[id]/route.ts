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

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const adminClient = getAdminClient();
    const { id } = await context.params;

    const { error } = await adminClient
      .from('monitored_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    return NextResponse.json({ success: true, message: '채널이 모니터링 목록에서 제거되었습니다.' });
  } catch (error: any) {
    console.error('Channel Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
