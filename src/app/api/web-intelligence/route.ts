import { NextResponse } from 'next/server';
import { getCopperFactsSSOT } from '@/lib/copper-facts';
import { enqueueWhatsAppMessage } from '@/lib/whatsapp-queue';

const WEB_BASE = (process.env.COPPERGIANT_WEB_URL || 'https://coppergiant.com').replace(/\/$/, '');
const INTEL_CACHE_TTL_MS = 60 * 1000;
let cachedIntel: { ts: number; payload: any } | null = null;

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
  if (cachedIntel && Date.now() - cachedIntel.ts < INTEL_CACHE_TTL_MS) {
    return NextResponse.json(cachedIntel.payload);
  }

  const [radar, intent, omnichannel, analytics, ssot] = await Promise.all([
    safeFetchJson(`${WEB_BASE}/api/seo-radar`),
    safeFetchJson(`${WEB_BASE}/api/investor-intent`),
    safeFetchJson(`${WEB_BASE}/api/omnichannel-stats`),
    safeFetchJson(`${WEB_BASE}/api/analytics?limit=250`),
    getCopperFactsSSOT(true),
  ]);

  const rawEvents = Array.isArray(analytics.data) ? analytics.data : [];
  const geoEvents = rawEvents
    .filter((e: any) => e?.geo?.country && e.geo.country !== 'Unknown')
    .map((e: any) => ({
      country: String(e.geo.country),
      city: e.geo.city ? String(e.geo.city) : '',
      org: e.geo.org ? String(e.geo.org) : '',
      type: String(e.type || ''),
      device: String(e.hw?.category || ''),
      timestamp: String(e.temporal?.timestampIso || e.timestamp || ''),
    }));

  const payload = {
    ok: true,
    sourceUrl: WEB_BASE,
    ssot,
    radar: radar.ok ? radar.data : null,
    intent: intent.ok ? intent.data : null,
    omnichannel: omnichannel.ok ? omnichannel.data : null,
    geoEvents,
    errors: {
      radar: radar.ok ? null : radar.data?.error || `HTTP ${radar.status}`,
      intent: intent.ok ? null : intent.data?.error || `HTTP ${intent.status}`,
      omnichannel: omnichannel.ok ? null : omnichannel.data?.error || `HTTP ${omnichannel.status}`,
    },
  };
  cachedIntel = { ts: Date.now(), payload };
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  try {
    cachedIntel = null;
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

    if (result.ok && result.data?.snapshot?.results && result.data?.previous?.results) {
      const prevMap = new Map<string, number | null>(
        result.data.previous.results.map((r: any) => [r.q, r.rank])
      );
      const drops: string[] = [];
      for (const r of result.data.snapshot.results) {
        const prev = prevMap.get(r.q);
        if (typeof prev === 'number' && typeof r.rank === 'number' && r.rank - prev >= 5) {
          drops.push(`• "${r.q}": #${prev} -> #${r.rank}`);
        }
      }
      if (drops.length > 0 && process.env.NOTIFY_TEAM_PHONE) {
        enqueueWhatsAppMessage({
          to: process.env.NOTIFY_TEAM_PHONE,
          text: `⚠️ *Alerta Kaizen SEO/GEO*\nCaída de posiciones detectada en ${WEB_BASE}:\n${drops.join('\n')}`,
          senderName: 'Kaizen SEO Radar',
        });
      }
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
