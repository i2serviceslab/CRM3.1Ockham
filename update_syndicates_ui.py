import os
import re

with open('src/components/syndicates/SyndicateManager.tsx', 'r') as f:
    code = f.read()

# 1. Update Imports
code = code.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")

# 2. Update Syndicate Interface
old_iface = """interface Syndicate {
  id: string;
  name: string;
  description: string;
  targetFocus: string;
  members: any[];
  createdAt: string;
}"""

new_iface = """interface Syndicate {
  id: string;
  name: string;
  description: string;
  targetFocus: string;
  members: any[];
  createdAt: string;
}""" # Actually no change here

# 3. Replace state initialization and add useEffect
old_state = """  const [syndicates, setSyndicates] = useState<Syndicate[]>([
    {
      id: 'syn-1',
      name: 'Consorcio Exploración Santa Ana Q3',
      description: 'Pool de Family Offices e Inversionistas Co-Líderes para la fase de perforación profunda.',
      targetFocus: 'Plata de Alta Ley (Ag)',
      members: contacts.slice(0, 3),
      createdAt: '2026-07-10',
    },
    {
      id: 'syn-2',
      name: 'Pool Family Offices & Capital Privado LatAm',
      description: 'Sindicato regional de inversionistas acreditados y firmas de corretaje institucional.',
      targetFocus: 'Desarrollo Minero & Exploración',
      members: contacts.slice(3, 6),
      createdAt: '2026-08-01',
    },
  ]);"""

new_state = """  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);

  useEffect(() => {
    fetchSyndicates();
  }, []);

  const fetchSyndicates = async () => {
    try {
      const res = await fetch('/api/syndicates');
      const data = await res.json();
      if (data.success) {
        setSyndicates(data.syndicates);
      }
    } catch (e) {
      console.error(e);
    }
  };"""

code = code.replace(old_state, new_state)

# 4. Replace handleCreateSyndicate
old_create = """  const handleCreateSyndicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const chosenMembers = contacts.filter((c) => selectedMemberIds.includes(c.id));

    const newSyn: Syndicate = {
      id: `syn-${Date.now()}`,
      name,
      description,
      targetFocus,
      members: chosenMembers,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setSyndicates([newSyn, ...syndicates]);
    setShowCreateModal(false);
    setName('');
    setDescription('');
    setTargetFocus('Plata de Alta Ley (Ag)');
    setSelectedMemberIds([]);
  };"""

new_create = """  const handleCreateSyndicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch('/api/syndicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, targetFocus, memberIds: selectedMemberIds })
      });
      const data = await res.json();
      if (data.success) {
        fetchSyndicates();
        setShowCreateModal(false);
        setName('');
        setDescription('');
        setTargetFocus('Plata de Alta Ley (Ag)');
        setSelectedMemberIds([]);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };"""

code = code.replace(old_create, new_create)


# 5. Add handleDeleteSyndicate
# Wait, let's see if delete exists. The code uses `Trash2`.
# Let's search if delete is implemented.
# I will just write a general replacement for delete if it exists, or inject it.
delete_inject_marker = "  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);"
delete_func = """
  const handleDeleteSyndicate = async (id: string) => {
    if(!confirm('¿Eliminar consorcio?')) return;
    try {
      await fetch(`/api/syndicates/${id}`, { method: 'DELETE' });
      fetchSyndicates();
    } catch(e) { console.error(e); }
  };
"""
code = code.replace(delete_inject_marker, delete_inject_marker + "\n" + delete_func)

# Fix onClick for Trash2
old_trash = "<Trash2 className=\"w-4 h-4\" />"
new_trash = "<Trash2 className=\"w-4 h-4\" onClick={() => handleDeleteSyndicate(syn.id)} />"
code = code.replace(old_trash, new_trash)

with open('src/components/syndicates/SyndicateManager.tsx', 'w') as f:
    f.write(code)

print("Syndicates UI updated!")
