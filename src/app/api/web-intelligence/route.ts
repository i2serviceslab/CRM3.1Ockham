import { NextResponse } from 'next/server';
import { getCopperFactsSSOT } from '@/lib/copper-facts';

const WEB_BASE = (process.env.COPPERGIANT_WEB_URL || 'https://coppergiant.com').replace(/\/$/, '');

async function safeFetchJson(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 502, data: { error: err?.message || 'Fetch failed' } };
  }
}

export async function GET() {
  const [radar, intent, omnichannel, ssot] = await Promise.all([
    safeFetchJson(`${WEB_BASE}/api/seo-radar`),
    safeFetchJson(`${WEB_BASE}/api/investor-intent`),
    safeFetchJson(`${WEB_BASE}/api/omnichannel-stats`),
    getCopperFactsSSOT(true),
  ]);

  return NextResponse.json({
    ok: true,
    sourceUrl: WEB_BASE,
    ssot,
    radar: radar.ok ? radar.data : null,
    intent: intent.ok ? intent.data : null,
    omnichannel: omnichannel.ok ? omnichannel.data : null,
    errors: {
      radar: radar.ok ? null : radar.data?.error || `HTTP ${radar.status}`,
      intent: intent.ok ? null : intent.data?.error || `HTTP ${intent.status}`,
      omnichannel: omnichannel.ok ? null : omnichannel.data?.error || `HTTP ${omnichannel.status}`,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === 'save_key') {
      const result = await safeFetchJson(`${WEB_BASE}/api/seo-radar/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serpapiKey: body.serpapiKey || '' }),
      });
      return NextResponse.json(result.data, { status: result.status });
    }

    const result = await safeFetchJson(`${WEB_BASE}/api/seo-radar/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
