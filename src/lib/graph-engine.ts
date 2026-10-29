import { prisma } from '@/lib/prisma';

// Generic consumer email providers to exclude from corporate domain clustering
export const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'aol.com', 'proton.me', 'protonmail.com', 'live.com', 'msn.com',
  'me.com', 'mac.com', 'zoho.com', 'mail.com', 'yandex.com',
  'comcast.net', 'sbcglobal.net', 'verizon.net', 'att.net', 'cox.net',
  'gmx.com', 'gmx.net', 'web.de', 't-online.de', 'orange.fr', 'free.fr',
  'wanadoo.fr', 'laposte.net', 'libero.it', 'virgilio.it', 'terra.com.br',
  'uol.com.br', 'bol.com.br', 'rediffmail.com', 'qq.com', '163.com',
  '126.com', 'sina.com'
]);

// Well-known mining finance, institutional funds, brokerages, and corporate entities
export const KNOWN_DOMAINS: Record<string, { company: string; location: string; investorType: string }> = {
  'canaccordgenuity.com': { company: 'Canaccord Genuity', location: 'Vancouver, BC, Canada', investorType: 'Broker / Intermediary' },
  'canaccord.com': { company: 'Canaccord Genuity', location: 'Vancouver, BC, Canada', investorType: 'Broker / Intermediary' },
  'bmo.com': { company: 'BMO Capital Markets', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'haywood.com': { company: 'Haywood Securities', location: 'Vancouver, BC, Canada', investorType: 'Broker / Intermediary' },
  'apexgeoscience.com': { company: 'APEX Geoscience Ltd.', location: 'Edmonton, AB, Canada', investorType: 'Strategic / Corporate' },
  'denariusmetals.com': { company: 'Denarius Metals', location: 'Toronto, ON, Canada', investorType: 'Strategic / Corporate' },
  'trafigura.com': { company: 'Trafigura', location: 'Geneva, Switzerland', investorType: 'Institutional / Strategic' },
  'nbc.ca': { company: 'National Bank of Canada', location: 'Montreal, QC, Canada', investorType: 'Institutional / Fund' },
  'rbc.com': { company: 'RBC Capital Markets', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'cormark.com': { company: 'Cormark Securities', location: 'Toronto, ON, Canada', investorType: 'Broker / Intermediary' },
  'redcloudsecurities.com': { company: 'Red Cloud Securities', location: 'Toronto, ON, Canada', investorType: 'Broker / Intermediary' },
  'sprott.com': { company: 'Sprott Capital Partners', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'stifel.com': { company: 'Stifel Nicolaus', location: 'Toronto, ON, Canada', investorType: 'Broker / Intermediary' },
  'raymondjames.ca': { company: 'Raymond James Ltd.', location: 'Vancouver, BC, Canada', investorType: 'Broker / Intermediary' },
  'raymondjames.com': { company: 'Raymond James', location: 'St. Petersburg, FL, USA', investorType: 'Broker / Intermediary' },
  'scotiabank.com': { company: 'Scotiabank Global Banking & Markets', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'cibc.com': { company: 'CIBC World Markets', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'td.com': { company: 'TD Securities', location: 'Toronto, ON, Canada', investorType: 'Institutional / Fund' },
  'goldman.com': { company: 'Goldman Sachs', location: 'New York, NY, USA', investorType: 'Institutional / Fund' },
  'morganstanley.com': { company: 'Morgan Stanley', location: 'New York, NY, USA', investorType: 'Institutional / Fund' },
  'anm.gov.co': { company: 'Agencia Nacional de Minería (ANM)', location: 'Bogotá, Colombia', investorType: 'Strategic / Government' },
  'minenergia.gov.co': { company: 'Ministerio de Minas y Energía', location: 'Bogotá, Colombia', investorType: 'Strategic / Government' },
  'sgc.gov.co': { company: 'Servicio Geológico Colombiano', location: 'Bogotá, Colombia', investorType: 'Strategic / Government' },
  'outcropsilver.com': { company: 'Outcrop Silver Corp.', location: 'Vancouver, BC, Canada', investorType: 'Strategic / Corporate' },
  'coppergiant.co': { company: 'Copper Giant Resources Corp.', location: 'Vancouver, BC, Canada', investorType: 'Strategic / Corporate' },
  'liberocobre.com': { company: 'Libero Cobre', location: 'Mocoa, Putumayo, Colombia', investorType: 'Strategic / Corporate' },
};

// Common geographic TLD inferences
export const TLD_LOCATIONS: Record<string, string> = {
  'ca': 'Canada',
  'uk': 'United Kingdom',
  'co.uk': 'United Kingdom',
  'ch': 'Switzerland',
  'co': 'Colombia',
  'pe': 'Peru',
  'cl': 'Chile',
  'au': 'Australia',
  'com.au': 'Australia',
  'de': 'Germany',
  'fr': 'France',
  'es': 'Spain',
  'it': 'Italy',
  'mx': 'Mexico',
  'za': 'South Africa',
  'sg': 'Singapore',
  'hk': 'Hong Kong',
};

export interface GraphEngineResult {
  totalContactsAnalyzed: number;
  contactsEnriched: number;
  relationshipsCreated: number;
  relationshipsExisting: number;
  companyClusters: number;
  eventClusters: number;
  topHubs: Array<{ id: string; name: string; company?: string; connections: number }>;
  durationSeconds: number;
}

let isGraphEngineRunning = false;

export async function runActiveGraphEngine(options: {
  maxBatchSize?: number;
  enrichContacts?: boolean;
  createRelationships?: boolean;
} = {}): Promise<GraphEngineResult> {
  if (isGraphEngineRunning) {
    return {
      totalContactsAnalyzed: 0,
      contactsEnriched: 0,
      relationshipsCreated: 0,
      relationshipsExisting: 0,
      companyClusters: 0,
      eventClusters: 0,
      topHubs: [],
      durationSeconds: 0,
    };
  }
  isGraphEngineRunning = true;
  try {
    return await executeActiveGraphEngine(options);
  } finally {
    isGraphEngineRunning = false;
  }
}

async function executeActiveGraphEngine(options: {
  maxBatchSize?: number;
  enrichContacts?: boolean;
  createRelationships?: boolean;
} = {}): Promise<GraphEngineResult> {
  const startTime = Date.now();
  const enrich = options.enrichContacts ?? true;
  const link = options.createRelationships ?? true;
  const maxBatchSize = options.maxBatchSize ?? 200;

  // 1. Fetch all contacts with essential fields
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      title: true,
      location: true,
      investorType: true,
      stage: true,
      source: true,
      tags: true,
      notes: true,
      relationshipScore: true,
    },
  });

  const totalContacts = contacts.length;
  let contactsEnriched = 0;
  let relationshipsCreated = 0;

  // Fetch existing relationships to avoid duplicates in-memory
  const existingRels = await prisma.relationship.findMany({
    select: { sourceContactId: true, targetContactId: true, relationshipType: true },
  });
  const existingPairSet = new Set<string>();
  for (const r of existingRels) {
    existingPairSet.add(`${r.sourceContactId}:${r.targetContactId}`);
    existingPairSet.add(`${r.targetContactId}:${r.sourceContactId}`);
  }

  // 2. Contact Auto-Enrichment Phase
  const contactUpdates: Array<{ id: string; data: any }> = [];

  for (const c of contacts) {
    let changed = false;
    const updateData: any = {};

    const email = (c.email || '').trim().toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';

    // A. Enrich Company & Location & InvestorType from Domain
    if (domain && KNOWN_DOMAINS[domain]) {
      const known = KNOWN_DOMAINS[domain];
      if (!c.company || c.company.trim().length === 0) {
        updateData.company = known.company;
        changed = true;
      }
      if (!c.location || c.location.trim().length === 0) {
        updateData.location = known.location;
        changed = true;
      }
      if (!c.investorType || c.investorType === 'Retail investor') {
        updateData.investorType = known.investorType;
        changed = true;
      }
    } else if (domain && !GENERIC_DOMAINS.has(domain)) {
      // Clean corporate domain to company name if company is empty
      if (!c.company || c.company.trim().length === 0) {
        const cleanDomainName = domain.split('.')[0];
        if (cleanDomainName.length > 2) {
          updateData.company = cleanDomainName.charAt(0).toUpperCase() + cleanDomainName.slice(1);
          changed = true;
        }
      }

      // Infer location from TLD if empty
      if (!c.location || c.location.trim().length === 0) {
        const parts = domain.split('.');
        const tld = parts[parts.length - 1];
        if (TLD_LOCATIONS[tld]) {
          updateData.location = TLD_LOCATIONS[tld];
          changed = true;
        }
      }
    }

    // B. Auto-classify Investor Type by Company Name Keywords
    const compName = (updateData.company || c.company || '').toLowerCase();
    if (!c.investorType || c.investorType === 'Retail investor') {
      if (
        compName.includes('capital') || compName.includes('fund') || compName.includes('partners') ||
        compName.includes('asset management') || compName.includes('ventures') || compName.includes('holdings')
      ) {
        updateData.investorType = 'Institutional / Fund';
        changed = true;
      } else if (compName.includes('family office') || compName.includes('fo ') || compName.includes('wealth')) {
        updateData.investorType = 'Family Office';
        changed = true;
      } else if (compName.includes('securities') || compName.includes('broker') || compName.includes('advisors')) {
        updateData.investorType = 'Broker / Intermediary';
        changed = true;
      } else if (compName.includes('mining') || compName.includes('resources') || compName.includes('exploration')) {
        updateData.investorType = 'Strategic / Corporate';
        changed = true;
      }
    }

    if (changed && enrich) {
      contactUpdates.push({ id: c.id, data: updateData });
    }
  }

  // Execute Enrichment Updates in a fast, bounded transaction (max 150 per tick to never lock SQLite)
  if (enrich && contactUpdates.length > 0) {
    const slice = contactUpdates.slice(0, 150);
    await prisma.$transaction(
      slice.map((update) =>
        prisma.contact.update({
          where: { id: update.id },
          data: update.data,
        })
      )
    );
    contactsEnriched += slice.length;
  }

  // 3. Multi-Layer Relationship Discovery Phase
  const newRelationshipsToInsert: Array<{
    sourceContactId: string;
    targetContactId: string;
    relationshipType: string;
    strength: number;
    notes: string;
  }> = [];

  // Index contacts by Company & Corporate Domain
  const companyBuckets = new Map<string, typeof contacts>();
  const corporateDomainBuckets = new Map<string, typeof contacts>();
  const eventBuckets = new Map<string, typeof contacts>();
  const nameToContactMap = new Map<string, typeof contacts[0]>();

  for (const c of contacts) {
    if (c.name && c.name.trim().length > 3) {
      nameToContactMap.set(c.name.trim().toLowerCase(), c);
    }

    // Company bucket
    const normCompany = (c.company || '').trim().toLowerCase();
    if (normCompany && normCompany.length > 2 && normCompany !== 'individual' && normCompany !== 'independent') {
      if (!companyBuckets.has(normCompany)) companyBuckets.set(normCompany, []);
      companyBuckets.get(normCompany)!.push(c);
    }

    // Corporate domain bucket
    const email = (c.email || '').trim().toLowerCase();
    if (email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain && !GENERIC_DOMAINS.has(domain)) {
        if (!corporateDomainBuckets.has(domain)) corporateDomainBuckets.set(domain, []);
        corporateDomainBuckets.get(domain)!.push(c);
      }
    }

    // Event & Cohort bucket
    const src = (c.source || '').trim().toLowerCase();
    const tags = (c.tags || '').trim().toLowerCase();
    if (src.includes('summit') || tags.includes('summit') || src.includes('atlantic one') || tags.includes('atlantic one')) {
      const key = 'Summit Atlantic One';
      if (!eventBuckets.has(key)) eventBuckets.set(key, []);
      eventBuckets.get(key)!.push(c);
    }
    if (src.includes('roadshow') || tags.includes('roadshow')) {
      const key = 'Pre-IPO Roadshow Cohort';
      if (!eventBuckets.has(key)) eventBuckets.set(key, []);
      eventBuckets.get(key)!.push(c);
    }
  }

  // Helper to register relationship candidates
  const linkPair = (sourceId: string, targetId: string, type: string, strength: number, notes: string) => {
    if (sourceId === targetId) return;
    const key = `${sourceId}:${targetId}`;
    if (existingPairSet.has(key)) return;

    existingPairSet.add(key);
    existingPairSet.add(`${targetId}:${sourceId}`);
    newRelationshipsToInsert.push({
      sourceContactId: sourceId,
      targetContactId: targetId,
      relationshipType: type,
      strength,
      notes,
    });
  };

  // Layer A: Connect Colleague Pairs from Company & Domain
  for (const [companyName, members] of companyBuckets.entries()) {
    if (members.length < 2 || members.length > 40) continue; // Avoid megalopolises
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        linkPair(
          members[i].id,
          members[j].id,
          'Colega / Misma Empresa',
          85,
          `Detectado automáticamente por entidad compartida: ${members[i].company}`
        );
      }
    }
  }

  for (const [domain, members] of corporateDomainBuckets.entries()) {
    if (members.length < 2 || members.length > 30) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        linkPair(
          members[i].id,
          members[j].id,
          'Misma Organización',
          80,
          `Detectado por dominio corporativo: @${domain}`
        );
      }
    }
  }

  // Layer B: Event Co-Attendance Linker
  for (const [eventName, attendees] of eventBuckets.entries()) {
    // For large events, link key high-score nodes or cluster up to 20 peers
    const sample = attendees.slice(0, 25);
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        linkPair(
          sample[i].id,
          sample[j].id,
          'Co-asistente a Evento',
          65,
          `Asistentes conjuntos al evento: ${eventName}`
        );
      }
    }
  }

  // Layer C: Cross-Referral & Named References in Notes
  for (const c of contacts) {
    const notesText = (c.notes || '').toLowerCase();
    if (!notesText || notesText.length < 5) continue;

    for (const [targetNameLower, targetContact] of nameToContactMap.entries()) {
      if (targetContact.id === c.id) continue;
      // Look for full name or last name mention in notes
      if (notesText.includes(targetNameLower) && targetNameLower.length > 5) {
        linkPair(
          c.id,
          targetContact.id,
          'Referido / Socio',
          95,
          `Vínculo explícito extraído de las notas: "${targetContact.name}"`
        );
      }
    }
  }

  // 4. Batch Insert Relationships into Database (bounded per tick to avoid locking SQLite)
  if (link && newRelationshipsToInsert.length > 0) {
    const boundedRels = newRelationshipsToInsert.slice(0, maxBatchSize);
    const BATCH_INSERT_SIZE = 100;
    for (let i = 0; i < boundedRels.length; i += BATCH_INSERT_SIZE) {
      const slice = boundedRels.slice(i, i + BATCH_INSERT_SIZE);
      await prisma.$transaction(
        slice.map(rel => prisma.relationship.create({ data: rel }))
      );
      relationshipsCreated += slice.length;
    }
  }

  // 5. Degree Centrality & Hub Calculation
  const degreeMap = new Map<string, number>();
  const allCurrentRels = await prisma.relationship.findMany({
    select: { sourceContactId: true, targetContactId: true },
  });
  for (const r of allCurrentRels) {
    degreeMap.set(r.sourceContactId, (degreeMap.get(r.sourceContactId) || 0) + 1);
    degreeMap.set(r.targetContactId, (degreeMap.get(r.targetContactId) || 0) + 1);
  }

  // Update relationship scores only for contacts whose score actually changed (bounded transaction)
  const scoreUpdates: Array<{ id: string; score: number }> = [];
  const contactScoreMap = new Map(contacts.map((c) => [c.id, c.relationshipScore]));
  for (const [contactId, count] of degreeMap.entries()) {
    const normalizedScore = Math.min(100, 50 + count * 5);
    if (contactScoreMap.get(contactId) !== normalizedScore) {
      scoreUpdates.push({ id: contactId, score: normalizedScore });
    }
  }
  if (scoreUpdates.length > 0) {
    const slice = scoreUpdates.slice(0, 150);
    await prisma.$transaction(
      slice.map((u) =>
        prisma.contact.update({
          where: { id: u.id },
          data: { relationshipScore: u.score },
        })
      )
    );
  }

  // Build top hubs list
  const topHubs = contacts
    .map(c => ({
      id: c.id,
      name: c.name,
      company: c.company || undefined,
      connections: degreeMap.get(c.id) || 0,
    }))
    .filter(h => h.connections > 0)
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

  return {
    totalContactsAnalyzed: totalContacts,
    contactsEnriched,
    relationshipsCreated,
    relationshipsExisting: existingRels.length,
    companyClusters: companyBuckets.size,
    eventClusters: eventBuckets.size,
    topHubs,
    durationSeconds,
  };
}
