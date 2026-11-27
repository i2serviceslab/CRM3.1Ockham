import { NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { isSlackConfigured, postSlackMessage } from '@/lib/slack-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSlackConfigured()) {
      return NextResponse.json({
        success: true,
        configured: false,
        connected: false,
        channels: [],
      });
    }

    const token = process.env.SLACK_BOT_TOKEN!;
    const [authRes, chRes] = await Promise.all([
      fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=30', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ]);

    const channels = Array.isArray(chRes?.channels)
      ? chRes.channels.map((c: any) => ({
          id: c.id,
          name: c.name,
          isMember: Boolean(c.is_member),
        }))
      : [];

    return NextResponse.json({
      success: true,
      configured: true,
      connected: Boolean(authRes?.ok),
      team: authRes?.team || null,
      teamId: authRes?.team_id || process.env.SLACK_TEAM_ID || null,
      botUser: authRes?.user || null,
      channels,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!requireRole(session, 'SUPER_ADMIN', 'TENANT_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { channel, text } = body;
    if (!channel || !text) {
      return NextResponse.json({ success: false, error: 'channel and text are required' }, { status: 400 });
    }

    const result = await postSlackMessage({ channel, text });
    return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 502 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
