const WEB_BASE = (process.env.COPPERGIANT_WEB_URL || 'https://coppergiant.com').replace(/\/$/, '');
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface CopperFactsSSOT {
  version: string;
  updatedAt: string;
  company: {
    name: string;
    formerName: string;
    tickers: string[];
    ceo: string;
    email: string;
    website: string;
    presentationVersion?: string;
    presentationInfo?: string;
    presentationUrl?: string;
  };
  latestNews?: { id: string; title: string; date: string; summary?: string; pdfUrl: string }[];
  mocoa: {
    location: string;
    ownership: string;
    mreEffectiveDate: string;
    mreAnnouncedDate: string;
    indicated: {
      tonnageMt: number;
      cuEqPct: number;
      cuPct: number;
      moPct: number;
      cuBlbs: number;
      moBlbs: number;
    };
    inferred: {
      tonnageBt: number;
      cuEqPct: number;
      cuPct: number;
      moPct: number;
      cuBlbs: number;
      moBlbs: number;
    };
    combined: {
      tonnageBt: number;
      cuBlbs: number;
      moBlbs: number;
    };
    peaTimeline: string;
    recentDrilling: { hole: string; date: string; highlight: string }[];
  };
  colombia: {
    presidentialTransition: string;
    block39: {
      name: string;
      location: string;
      areaHa: number;
      signedDate: string;
      anmTier: string;
    };
    investorProtections: string;
  };
  strictRules: string[];
}

const FALLBACK_FACTS: CopperFactsSSOT = {
  version: '2026-10-27',
  updatedAt: '2026-11-24T15:00:00Z',
  company: {
    name: 'Copper Giant Resources Corp.',
    formerName: 'Libero Copper & Gold Corporation (rebranded April 2025)',
    tickers: ['TSXV: CGNT', 'OTCQX: CGNRF', 'FSE: 29H0'],
    ceo: 'Ian Harris, P.Eng.',
    email: 'info@coppergiant.com',
    website: 'https://coppergiant.com',
  },
  mocoa: {
    location: 'Putumayo Department, southern Colombia',
    ownership: '100%',
    mreEffectiveDate: '2026-09-24',
    mreAnnouncedDate: '2026-10-14',
    indicated: { tonnageMt: 290, cuEqPct: 0.54, cuPct: 0.33, moPct: 0.038, cuBlbs: 2.13, moBlbs: 0.24 },
    inferred: { tonnageBt: 1.60, cuEqPct: 0.40, cuPct: 0.27, moPct: 0.025, cuBlbs: 9.36, moBlbs: 0.89 },
    combined: { tonnageBt: 1.89, cuBlbs: 11.49, moBlbs: 1.13 },
    peaTimeline: 'Q4 2026',
    recentDrilling: [
      { hole: 'MD-074', date: '2026-10-27', highlight: '135 m of 1.60% CuEq* (1.02% Cu, 0.107% Mo) within 724 m of 0.78% CuEq*' },
      { hole: 'MD-073', date: '2026-09-22', highlight: '103 m of 1.07% CuEq* (0.57% Cu, 0.095% Mo) within 804 m of 0.56% CuEq*' },
    ],
  },
  colombia: {
    presidentialTransition: 'August 7, 2026 — President Abelardo de la Espriella',
    block39: {
      name: 'ANM Strategic Mining Area Block 39 (Chaparral Block)',
      location: 'Chaparral, Tolima, Colombia',
      areaHa: 3923,
      signedDate: '2026-10-26',
      anmTier: 'Type C (highest capability tier)',
    },
    investorProtections: 'Constitutional separation of powers, independent judiciary, codified Mining Code overseen by ANM, BITs, FTAs, and ICSID arbitration.',
  },
  strictRules: [
    'NEVER cite outdated resource figures such as 4.6B lbs CuEq.',
    'Always cite Mocoa NI 43-101 MRE as 290 Mt Indicated @ 0.54% CuEq* (2.13 Blbs Cu, 0.24 Blbs Mo) and 1.60 Bt Inferred @ 0.40% CuEq* (9.36 Blbs Cu, 0.89 Blbs Mo).',
    'Do not invent economic metrics (NPV, IRR, Capex) prior to the Q4 2026 PEA filing.',
  ],
};

let cachedFacts: CopperFactsSSOT | null = null;
let cachedAt = 0;

export async function getCopperFactsSSOT(forceRefresh = false): Promise<CopperFactsSSOT> {
  const now = Date.now();
  if (!forceRefresh && cachedFacts && now - cachedAt < CACHE_TTL_MS) {
    return cachedFacts;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${WEB_BASE}/api/facts-ssot`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const parsed = (await res.json()) as CopperFactsSSOT;
      if (parsed?.mocoa?.indicated && parsed?.company?.name) {
        cachedFacts = parsed;
        cachedAt = now;
        return parsed;
      }
    }
  } catch {
    // Fallback to verified in-repo snapshot if remote is unreachable
  }
  return cachedFacts || FALLBACK_FACTS;
}

export async function getCopperFactsPromptBlock(): Promise<string> {
  const f = await getCopperFactsSSOT();
  const ind = f.mocoa.indicated;
  const inf = f.mocoa.inferred;
  const comb = f.mocoa.combined;
  const drills = f.mocoa.recentDrilling.map((d) => `${d.hole} (${d.date}): ${d.highlight}`).join(' | ');
  const presLine = f.company.presentationInfo
    ? `- Presentación Corporativa Actual: ${f.company.presentationInfo} (${f.company.presentationUrl || 'https://coppergiant.com/assets/corporate-presentation.pdf'})`
    : '';
  const newsLine = Array.isArray(f.latestNews) && f.latestNews.length
    ? `- Últimos Comunicados Oficiales: ${f.latestNews.slice(0, 3).map((n) => `[${n.date}] ${n.title}`).join(' | ')}`
    : '';
  return [
    `[FUENTE ÚNICA DE VERDAD OFICIAL — SSOT v${f.version}]`,
    `- Compañía: ${f.company.name} (${f.company.tickers.join(' | ')}) | CEO: ${f.company.ceo} | Antes: ${f.company.formerName}`,
    presLine,
    newsLine,
    `- Mocoa NI 43-101 MRE (efectivo ${f.mocoa.mreEffectiveDate}, anunciado ${f.mocoa.mreAnnouncedDate}):`,
    `  * Indicated: ${ind.tonnageMt} Mt @ ${ind.cuEqPct}% CuEq* (${ind.cuPct}% Cu, ${ind.moPct}% Mo) = ${ind.cuBlbs} Blbs Cu y ${ind.moBlbs} Blbs Mo.`,
    `  * Inferred: ${inf.tonnageBt} Bt @ ${inf.cuEqPct}% CuEq* (${inf.cuPct}% Cu, ${inf.moPct}% Mo) = ${inf.cuBlbs} Blbs Cu y ${inf.moBlbs} Blbs Mo.`,
    `  * Total combinado: ${comb.tonnageBt} Bt (${comb.cuBlbs} Blbs Cu, ${comb.moBlbs} Blbs Mo). PEA: ${f.mocoa.peaTimeline}.`,
    `- Perforación reciente: ${drills}`,
    `- Colombia 2026: ${f.colombia.presidentialTransition}. ${f.colombia.block39.name} (${f.colombia.block39.areaHa} ha en ${f.colombia.block39.location}, firmado ${f.colombia.block39.signedDate}, ${f.colombia.block39.anmTier}).`,
    `- REGLAS ESTRICTAS: ${f.strictRules.join(' ')}`,
  ].filter(Boolean).join('\n');
}
