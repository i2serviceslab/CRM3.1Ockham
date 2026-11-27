'use client';

import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, User, Command, X } from 'lucide-react';
import { ActiveTab } from '@/components/layout/Sidebar';
import { Contact } from '@/types/crm';

const TAB_COMMANDS: Array<{ id: ActiveTab; label: string; keywords: string }> = [
  { id: 'contacts', label: '360° Contacts', keywords: 'contactos directorio leads' },
  { id: 'graph', label: 'Relationship Graph', keywords: 'grafo red relaciones' },
  { id: 'followup', label: 'Follow-up Pipeline', keywords: 'kanban tareas seguimiento' },
  { id: 'hermes-agent', label: 'El Olimpo AI', keywords: 'ia agentes hermes chat' },
  { id: 'roadshows', label: 'Roadshows & Summits', keywords: 'eventos cumbres conferencias' },
  { id: 'social-calendar', label: 'Social Calendar', keywords: 'redes calendario posts' },
  { id: 'meetings', label: 'Meeting Intelligence', keywords: 'reuniones audio actas' },
  { id: 'whatsapp', label: 'WhatsApp Olimpo', keywords: 'whatsapp mensajes chat' },
  { id: 'workflows', label: 'Workflows & Rules', keywords: 'automatizaciones reglas' },
  { id: 'media-drive', label: 'Repositorio & Drive IA', keywords: 'archivos drive pdf documentos' },
  { id: 'users', label: 'Users & Roles', keywords: 'usuarios permisos admin' },
  { id: 'backups', label: 'Database Backups', keywords: 'respaldos copias base' },
  { id: 'analytics', label: 'Analytics & Reports', keywords: 'metricas reportes graficas' },
  { id: 'kaizen-radar', label: 'Kaizen & SEO/GEO', keywords: 'seo mapa paises visitantes serpapi' },
  { id: 'settings', label: 'Branding & Theme', keywords: 'tema colores logo' },
];

export const CommandPalette: React.FC<{
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectContact: (contact: Contact) => void;
  onNewContact: () => void;
}> = ({ onNavigateTab, onSelectContact, onNewContact }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setContacts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?search=${encodeURIComponent(query.trim())}&limit=6`);
        const data = await res.json();
        if (data.success) setContacts(data.contacts || []);
      } catch {}
    }, 180);
    return () => clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matchedTabs = TAB_COMMANDS.filter(
    (t) => !q || t.label.toLowerCase().includes(q) || t.keywords.includes(q)
  ).slice(0, 6);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70] flex items-start justify-center pt-[12vh] p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#141522] border border-white/15 rounded-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contactos, pestañas o acciones (Cmd+K)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
          {contacts.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">Contactos</div>
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectContact(c);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-sm hover:bg-white/5 text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User className="w-4 h-4 text-[#FF002C] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.company || c.email || c.phone}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">Navegación Rápida</div>
            <button
              onClick={() => {
                onNewContact();
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-sm hover:bg-white/5 text-left"
            >
              <span className="text-xs font-bold text-emerald-400">+ Crear Nuevo Contacto</span>
              <Command className="w-3.5 h-3.5 text-slate-500" />
            </button>
            {matchedTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onNavigateTab(t.id);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-sm hover:bg-white/5 text-left"
              >
                <span className="text-xs font-semibold text-slate-200">{t.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
