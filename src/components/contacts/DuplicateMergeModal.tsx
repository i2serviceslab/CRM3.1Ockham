'use client';

import React, { useEffect, useState } from 'react';
import { GitMerge, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DuplicateGroup {
  reason: string;
  key: string;
  contacts: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    company?: string | null;
    leadScore?: number;
  }>;
}

export const DuplicateMergeModal: React.FC<{
  onClose: () => void;
  onMerged: () => void;
}> = ({ onClose, onMerged }) => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts/duplicates');
      const data = await res.json();
      if (data.success) setGroups(data.duplicates || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleMergePair = async (group: DuplicateGroup) => {
    if (group.contacts.length < 2) return;
    const primary = group.contacts[0];
    const secondary = group.contacts[1];
    setMergingKey(`${primary.id}:${secondary.id}`);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId: primary.id, secondaryId: secondary.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Fusionado "${secondary.name}" dentro de "${primary.name}".`);
        await loadDuplicates();
        onMerged();
      } else {
        setStatusMsg(data.error || 'Error al fusionar');
      }
    } catch {
      setStatusMsg('Error de conexión al fusionar');
    } finally {
      setMergingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#191a2e] border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <GitMerge className="w-4 h-4 text-[#FF002C]" />
            <span>Detector de Duplicados y Fusión Inteligente</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {statusMsg && (
            <div className="p-3 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Analizando base de contactos...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 text-xs text-emerald-400 font-semibold">
              No se detectaron contactos duplicados en la base actual.
            </div>
          ) : (
            groups.map((g, idx) => (
              <div key={`${g.reason}-${g.key}-${idx}`} className="p-4 rounded-sm bg-black/30 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {g.reason}: <span className="font-mono text-white">{g.key}</span>
                  </span>
                  <button
                    onClick={() => handleMergePair(g)}
                    disabled={mergingKey !== null}
                    className="px-3 py-1.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-white text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <GitMerge className="w-3 h-3" />
                    <span>Fusionar primeros 2</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {g.contacts.slice(0, 2).map((c, ci) => (
                    <div key={c.id} className="p-2.5 rounded-sm bg-white/[0.03] border border-white/5 text-xs">
                      <div className="font-bold text-white flex items-center justify-between">
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{ci === 0 ? 'Principal' : 'Duplicado'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{c.company || 'Sin empresa'}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">{c.email || c.whatsapp || c.phone || 'Sin datos'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
