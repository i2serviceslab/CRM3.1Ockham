'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe } from 'lucide-react';

export interface GeoVisitEvent {
  country: string;
  city?: string;
  type?: string;
  device?: string;
}

const COUNTRY_TO_ISO: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Andorra: 'AD', Angola: 'AO',
  Argentina: 'AR', Armenia: 'AM', Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ',
  Bahamas: 'BS', Bahrain: 'BH', Bangladesh: 'BD', Barbados: 'BB', Belarus: 'BY',
  Belgium: 'BE', Belize: 'BZ', Benin: 'BJ', Bhutan: 'BT', Bolivia: 'BO',
  'Bosnia and Herzegovina': 'BA', Botswana: 'BW', Brazil: 'BR', Brunei: 'BN', Bulgaria: 'BG',
  'Burkina Faso': 'BF', Burundi: 'BI', Cambodia: 'KH', Cameroon: 'CM', Canada: 'CA',
  'Cape Verde': 'CV', 'Central African Republic': 'CF', Chad: 'TD', Chile: 'CL', China: 'CN',
  Colombia: 'CO', Comoros: 'KM', Congo: 'CG', 'Costa Rica': 'CR', Croatia: 'HR',
  Cuba: 'CU', Cyprus: 'CY', 'Czech Republic': 'CZ', Czechia: 'CZ', Denmark: 'DK',
  Djibouti: 'DJ', 'Dominican Republic': 'DO', Ecuador: 'EC', Egypt: 'EG', 'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ', Eritrea: 'ER', Estonia: 'EE', Ethiopia: 'ET', Fiji: 'FJ',
  Finland: 'FI', France: 'FR', Gabon: 'GA', Gambia: 'GM', Georgia: 'GE',
  Germany: 'DE', Ghana: 'GH', Greece: 'GR', Guatemala: 'GT', Guinea: 'GN',
  Guyana: 'GY', Haiti: 'HT', Honduras: 'HN', Hungary: 'HU', Iceland: 'IS',
  India: 'IN', Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Ireland: 'IE',
  Israel: 'IL', Italy: 'IT', Jamaica: 'JM', Japan: 'JP', Jordan: 'JO',
  Kazakhstan: 'KZ', Kenya: 'KE', Kuwait: 'KW', Kyrgyzstan: 'KG', Laos: 'LA',
  Latvia: 'LV', Lebanon: 'LB', Lesotho: 'LS', Liberia: 'LR', Libya: 'LY',
  Liechtenstein: 'LI', Lithuania: 'LT', Luxembourg: 'LU', Madagascar: 'MG', Malawi: 'MW',
  Malaysia: 'MY', Maldives: 'MV', Mali: 'ML', Malta: 'MT', Mauritania: 'MR',
  Mauritius: 'MU', Mexico: 'MX', Moldova: 'MD', Monaco: 'MC', Mongolia: 'MN',
  Montenegro: 'ME', Morocco: 'MA', Mozambique: 'MZ', Myanmar: 'MM', Namibia: 'NA',
  Nepal: 'NP', Netherlands: 'NL', 'The Netherlands': 'NL', 'New Zealand': 'NZ', Nicaragua: 'NI',
  Niger: 'NE', Nigeria: 'NG', 'North Korea': 'KP', Norway: 'NO', Oman: 'OM',
  Pakistan: 'PK', Panama: 'PA', 'Papua New Guinea': 'PG', Paraguay: 'PY', Peru: 'PE',
  Philippines: 'PH', Poland: 'PL', Portugal: 'PT', Qatar: 'QA', Romania: 'RO',
  Russia: 'RU', Rwanda: 'RW', 'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS',
  Seychelles: 'SC', 'Sierra Leone': 'SL', Singapore: 'SG', Slovakia: 'SK', Slovenia: 'SI',
  Somalia: 'SO', 'South Africa': 'ZA', 'South Korea': 'KR', Spain: 'ES', 'Sri Lanka': 'LK',
  Sudan: 'SD', Suriname: 'SR', Swaziland: 'SZ', Sweden: 'SE', Switzerland: 'CH',
  Syria: 'SY', Taiwan: 'TW', Tajikistan: 'TJ', Tanzania: 'TZ', Thailand: 'TH',
  Togo: 'TG', 'Trinidad and Tobago': 'TT', Tunisia: 'TN', Turkey: 'TR', Turkmenistan: 'TM',
  Uganda: 'UG', Ukraine: 'UA', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  'United States': 'US', Uruguay: 'UY', Uzbekistan: 'UZ', Venezuela: 'VE', Vietnam: 'VN',
  Yemen: 'YE', Zambia: 'ZM', Zimbabwe: 'ZW',
};

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export const VisitorWorldMap: React.FC<{ events: GeoVisitEvent[] }> = ({ events }) => {
  const [layer, setLayer] = useState<'all' | 'pdf' | 'desktop' | 'mobile'>('all');
  const [mapReady, setMapReady] = useState(false);
  const mapHostRef = useRef<HTMLDivElement | null>(null);

  const filteredEvents = useMemo(() => {
    if (layer === 'pdf') return events.filter((e) => e.type === 'presentation_view');
    if (layer === 'desktop') return events.filter((e) => e.device === 'Desktop');
    if (layer === 'mobile') return events.filter((e) => e.device === 'Mobile');
    return events;
  }, [events, layer]);

  const { isoCounts, topCountries, maxCount } = useMemo(() => {
    const byIso: Record<string, number> = {};
    const byName: Record<string, number> = {};
    let max = 0;
    for (const ev of filteredEvents) {
      if (!ev.country || ev.country === 'Unknown') continue;
      byName[ev.country] = (byName[ev.country] || 0) + 1;
      const iso = COUNTRY_TO_ISO[ev.country];
      if (iso) {
        byIso[iso] = (byIso[iso] || 0) + 1;
        if (byIso[iso] > max) max = byIso[iso];
      }
    }
    const top = Object.entries(byName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return { isoCounts: byIso, topCountries: top, maxCount: max };
  }, [filteredEvents]);

  useEffect(() => {
    let cancelled = false;
    const cssHref = 'https://cdn.jsdelivr.net/npm/jsvectormap/dist/css/jsvectormap.min.css';
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }

    (async () => {
      try {
        if (!(window as any).jsVectorMap) {
          await loadScriptOnce('https://cdn.jsdelivr.net/npm/jsvectormap');
        }
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/jsvectormap/dist/maps/world.js');
        if (!cancelled) setMapReady(true);
      } catch {
        // Ranking list still displays even if CDN fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = mapHostRef.current;
    const JsVectorMap = (window as any).jsVectorMap;
    if (!mapReady || !host || !JsVectorMap) return;

    host.innerHTML = '';
    const mapEl = document.createElement('div');
    mapEl.style.width = '100%';
    mapEl.style.height = '100%';
    host.appendChild(mapEl);

    const regionColors: Record<string, string> = {};
    for (const iso of Object.keys(isoCounts)) {
      const val = isoCounts[iso];
      const ratio = maxCount > 1 ? (val - 1) / (maxCount - 1) : 1;
      const lightness = 72 - ratio * 42;
      regionColors[iso] = `hsl(0, 100%, ${lightness}%)`;
    }

    try {
      new JsVectorMap({
        selector: mapEl,
        map: 'world',
        backgroundColor: 'transparent',
        zoomOnScroll: false,
        regionStyle: {
          initial: {
            fill: '#1e2630',
            fillOpacity: 1,
            stroke: '#0b0f14',
            strokeWidth: 1,
          },
          hover: {
            fillOpacity: 0.85,
            cursor: 'pointer',
          },
        },
        series: {
          regions: [
            {
              values: regionColors,
              attribute: 'fill',
            },
          ],
        },
        onRegionTooltipShow(_event: any, tooltip: any, code: string) {
          const count = isoCounts[code] || 0;
          const label = layer === 'pdf' ? 'Lecturas PDF' : 'Visitas';
          tooltip.text(`${tooltip.text()} — ${count} ${label}`);
        },
      });
    } catch {}
  }, [mapReady, isoCounts, maxCount, layer]);

  const totalTop = topCountries.reduce((acc, [, n]) => acc + n, 0) || 1;

  return (
    <div className="bg-[#1C1B1B] border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Globe className="w-4 h-4 text-[#FF002C]" />
          <span>Mapa Global de Visitantes (coppergiant.com)</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: 'Tráfico Global' },
              { id: 'pdf', label: 'Interés PDF' },
              { id: 'desktop', label: 'Escritorio' },
              { id: 'mobile', label: 'Móvil' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setLayer(btn.id)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                layer === btn.id
                  ? 'bg-[#FF002C] text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div
          ref={mapHostRef}
          className="lg:col-span-2 h-[360px] bg-[#121820] rounded-lg overflow-hidden border border-white/5 flex items-center justify-center"
        >
          {!mapReady && (
            <span className="text-xs text-slate-400">Cargando mapa mundial...</span>
          )}
        </div>

        <div className="bg-black/30 border border-white/5 rounded-lg p-4 space-y-3 overflow-y-auto max-h-[360px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>Países con Mayor Tráfico</span>
            <span className="font-mono text-slate-400">{filteredEvents.length} eventos</span>
          </div>

          {topCountries.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              Sin visitas geolocalizadas en este filtro.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topCountries.map(([country, count]) => {
                const pct = Math.round((count / totalTop) * 100);
                return (
                  <div key={country} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold truncate">{country}</span>
                      <span className="font-mono text-slate-300">
                        {count} <span className="text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF002C] rounded-full"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
