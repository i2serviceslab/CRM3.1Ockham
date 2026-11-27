'use client';

import React, { useEffect, useState } from 'react';
import { Globe, RefreshCw, Sparkles, Target, TrendingUp, ExternalLink, KeyRound } from 'lucide-react';
import { VisitorWorldMap, GeoVisitEvent } from '@/components/analytics/VisitorWorldMap';

interface RadarResult {
  q: string;
  category: string;
  rank: number | null;
  link: string | null;
  hasAiOverview?: boolean;
  aiCited?: boolean;
}

interface RadarSnapshot {
  timestamp: string;
  indexedCount: number | null;
  results: RadarResult[];
}

interface IntentSession {
  sessionId: string;
  country: string;
  city: string;
  pages: string[];
  signals: string[];
  score: number;
}

export const KaizenWebIntelligence: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('https://coppergiant.com');
  const [hasKey, setHasKey] = useState(true);
  const [serpKeyInput, setSerpKeyInput] = useState('');
  const [latestRadar, setLatestRadar] = useState<RadarSnapshot | null>(null);
  const [prevRadar, setPrevRadar] = useState<RadarSnapshot | null>(null);
  const [radarHistory, setRadarHistory] = useState<RadarSnapshot[]>([]);
  const [intent, setIntent] = useState<{
    totalSessions: number;
    segments: Record<string, number>;
    topSessions: IntentSession[];
  } | null>(null);
  const [omni, setOmni] = useState<any>(null);
  const [geoEvents, setGeoEvents] = useState<GeoVisitEvent[]>([]);
  const [ssot, setSsot] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/web-intelligence');
      const data = await res.json();
      if (data.sourceUrl) setSourceUrl(data.sourceUrl);
      if (data.radar) {
        setHasKey(Boolean(data.radar.hasKey));
        setLatestRadar(data.radar.latest || null);
        setPrevRadar(data.radar.previous || null);
        setRadarHistory(Array.isArray(data.radar.history) ? data.radar.history : []);
      }
      if (data.intent) setIntent(data.intent);
      if (data.omnichannel) setOmni(data.omnichannel);
      if (Array.isArray(data.geoEvents)) setGeoEvents(data.geoEvents);
      if (data.ssot) setSsot(data.ssot);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error conectando con coppergiant.com');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRunRadar = async () => {
    setScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/web-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_radar' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Error ejecutando escaneo');
      setLatestRadar(data.snapshot || null);
      setPrevRadar(data.previous || null);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al escanear');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveKey = async () => {
    if (!serpKeyInput.trim()) return;
    setErrorMsg(null);
    const res = await fetch('/api/web-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_key', serpapiKey: serpKeyInput.trim() }),
    });
    if (res.ok) {
      setSerpKeyInput('');
      await loadAll();
    } else {
      setErrorMsg('No se pudo guardar la SerpApi Key');
    }
  };

  const prevRankMap: Record<string, number | null> = {};
  if (prevRadar?.results) {
    prevRadar.results.forEach((r) => {
      prevRankMap[r.q] = r.rank;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1C1B1B] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kaizen &amp; SEO/GEO Web Intelligence</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Radar de Posicionamiento IA &amp; Telemetría Web
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fuente en vivo: <span className="font-mono text-slate-300">{sourceUrl}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={handleRunRadar}
            disabled={scanning}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 disabled:opacity-60"
          >
            <Globe className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Escaneando SerpApi...' : 'Escanear SEO/GEO'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg px-4 py-3">
          {errorMsg}
        </div>
      )}

      {ssot && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-emerald-300 font-semibold">
            SSOT Oficial Activo (v{ssot.version}): <span className="text-white font-mono">{ssot.mocoa?.indicated?.tonnageMt} Mt Indicated @ {ssot.mocoa?.indicated?.cuEqPct}% CuEq*</span> &amp; <span className="text-white font-mono">{ssot.mocoa?.inferred?.tonnageBt} Bt Inferred @ {ssot.mocoa?.inferred?.cuEqPct}% CuEq*</span>
          </div>
          <div className="text-[11px] font-mono text-emerald-400/90">
            Block 39: {ssot.colombia?.block39?.areaHa} ha · PEA: {ssot.mocoa?.peaTimeline}
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase text-slate-400">Páginas Indexadas</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {latestRadar?.indexedCount ?? '—'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">site:coppergiant.com</div>
        </div>
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase text-slate-400">Sesiones Web Analizadas</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {intent?.totalSessions ?? '—'}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Colombia/Stock: {intent?.segments?.colombia_stock ?? 0} · Mocoa: {intent?.segments?.mocoa_technical ?? 0}
          </div>
        </div>
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase text-slate-400">Impresiones Sociales</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {omni?.social?.total_impressions ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Engagements: {omni?.social?.total_engagements ?? 0}
          </div>
        </div>
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase text-slate-400">Campañas Brevo</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {omni?.brevo?.campaigns ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Enviados: {omni?.brevo?.sent ?? 0} · Clics: {omni?.brevo?.clicked ?? 0}
          </div>
        </div>
      </div>

      {/* Global Visitor Country Map */}
      <VisitorWorldMap events={geoEvents} />

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: SEO & GEO SerpApi Radar */}
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Radar SEO &amp; GEO (Google + AI Overview)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {latestRadar?.timestamp ? new Date(latestRadar.timestamp).toLocaleString() : 'Sin escaneo'}
            </span>
          </div>

          {!hasKey && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
              <div className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Configurar SerpApi Key en {sourceUrl}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={serpKeyInput}
                  onChange={(e) => setSerpKeyInput(e.target.value)}
                  placeholder="Pegar SerpApi Key..."
                  className="flex-1 bg-black/40 border border-white/15 rounded-md px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {latestRadar?.results?.length ? (
              latestRadar.results.map((r) => {
                const prevRank = prevRankMap[r.q];
                const diff = r.rank && prevRank ? prevRank - r.rank : 0;
                return (
                  <div
                    key={r.q}
                    className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{r.q}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono uppercase">{r.category}</span>
                        {r.aiCited ? (
                          <span className="text-emerald-400 font-semibold">AI Overview ✓</span>
                        ) : r.hasAiOverview ? (
                          <span className="text-amber-400">AI Overview ○</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-black text-sm ${
                          r.rank && r.rank <= 5 ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {r.rank ? `#${r.rank}` : '>20'}
                      </span>
                      {diff !== 0 && (
                        <span className={`text-xs font-mono ${diff > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Pulsa <strong>Escanear SEO/GEO</strong> para capturar posiciones y citas de IA en vivo.
              </div>
            )}
          </div>

          {radarHistory.length > 1 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Evolución Histórica ({radarHistory.length} escaneos)
              </div>
              <div className="flex items-end gap-1.5 h-12">
                {radarHistory.slice(-10).map((snap, i) => {
                  const ranked = (snap.results || []).filter((r) => typeof r.rank === 'number');
                  const avg = ranked.length
                    ? ranked.reduce((acc, r) => acc + (r.rank || 20), 0) / ranked.length
                    : 20;
                  const heightPct = Math.max(15, Math.min(100, Math.round(((21 - avg) / 20) * 100)));
                  return (
                    <div key={snap.timestamp || i} className="flex-1 flex flex-col items-center gap-1" title={`${new Date(snap.timestamp).toLocaleDateString()} · Promedio #${avg.toFixed(1)}`}>
                      <div className="w-full bg-emerald-500/70 rounded-t-sm" style={{ height: `${heightPct}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Investor Intent Sessions */}
        <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Intención de Inversionistas en coppergiant.com</span>
            </div>
            <a
              href={`${sourceUrl}/omnichannel.html`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Abrir Omnichannel</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-lg font-black text-white font-mono">{intent?.segments?.colombia_stock ?? 0}</div>
              <div className="text-[10px] text-slate-400">Colombia / Stock</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-lg font-black text-white font-mono">{intent?.segments?.mocoa_technical ?? 0}</div>
              <div className="text-[10px] text-slate-400">Mocoa NI 43-101</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-lg font-black text-white font-mono">{intent?.segments?.executive_deck ?? 0}</div>
              <div className="text-[10px] text-slate-400">Deck / Connect</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-lg font-black text-white font-mono">{intent?.segments?.corporate_esg ?? 0}</div>
              <div className="text-[10px] text-slate-400">Corp &amp; ESG</div>
            </div>
          </div>

          <div className="space-y-2">
            {intent?.topSessions?.length ? (
              intent.topSessions.slice(0, 6).map((s) => (
                <div
                  key={s.sessionId}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      {s.city ? `${s.city}, ` : ''}{s.country}
                    </span>
                    <span
                      className={`text-xs font-mono font-black ${
                        s.score >= 50 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {s.score}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {s.signals?.length ? s.signals.join(' · ') : 'Navegación general'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    {s.pages?.join(' → ')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Aún no hay sesiones web clasificadas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
