export interface ContactHealth {
  emailValid: boolean;
  phoneValid: boolean;
  issues: string[];
}

export function getContactHealth(contact: {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}): ContactHealth {
  const issues: string[] = [];
  const email = (contact.email || '').trim();
  const phoneDigits = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (email && !emailValid) issues.push('Email inválido');

  const phoneValid = !phoneDigits || (phoneDigits.length >= 7 && phoneDigits.length <= 15);
  if (phoneDigits && !phoneValid) issues.push('Teléfono inválido');

  if (!email && !phoneDigits) issues.push('Sin canal de contacto');

  return { emailValid, phoneValid, issues };
}

export interface DecayConfig {
  graceDays: number;
  maxPenalty: number;
  pointsPer30Days: number;
  floorScore: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  graceDays: 30,
  maxPenalty: 25,
  pointsPer30Days: 8,
  floorScore: 10,
};

/**
 * Configurable time-decay score calculation (matizable by team rules).
 */
export function applyTimeDecayScore(
  baseScore: number,
  updatedAt?: string | Date | null,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): { effectiveScore: number; decayPenalty: number; daysInactive: number } {
  if (!updatedAt) {
    return { effectiveScore: baseScore, decayPenalty: 0, daysInactive: 0 };
  }
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) {
    return { effectiveScore: baseScore, decayPenalty: 0, daysInactive: 0 };
  }
  const daysInactive = Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
  if (daysInactive <= config.graceDays) {
    return { effectiveScore: baseScore, decayPenalty: 0, daysInactive };
  }
  const periods = Math.floor((daysInactive - config.graceDays) / 30) + 1;
  const decayPenalty = Math.min(config.maxPenalty, periods * config.pointsPer30Days);
  const effectiveScore = Math.max(config.floorScore, baseScore - decayPenalty);
  return { effectiveScore, decayPenalty, daysInactive };
}

export const STAKEHOLDER_CUSTOM_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  Media: [
    { key: 'outlet', label: 'Medio / Publicación', placeholder: 'Ej. Mining.com / El Tiempo' },
    { key: 'beat', label: 'Cobertura / Tema', placeholder: 'Ej. Minería, ESG, Energía' },
  ],
  'Government/regulatory': [
    { key: 'entity', label: 'Entidad / Ministerio', placeholder: 'Ej. ANM / MinEnergía / Alcaldía' },
    { key: 'jurisdiction', label: 'Jurisdicción', placeholder: 'Ej. Putumayo / Nacional' },
  ],
  'Corporate strategic': [
    { key: 'sector', label: 'Sector / Alianza', placeholder: 'Ej. Energía, Logística, Proveedor' },
    { key: 'region', label: 'Región de Operación', placeholder: 'Ej. LatAm / Norteamérica' },
  ],
  default: [
    { key: 'preferredChannel', label: 'Canal Preferido', placeholder: 'WhatsApp / Email / Llamada' },
    { key: 'language', label: 'Idioma Preferido', placeholder: 'Español / Inglés' },
  ],
};
