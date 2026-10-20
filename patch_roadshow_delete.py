import re

with open('src/components/roadshows/RoadshowManager.tsx', 'r') as f:
    code = f.read()

# 1. Import Trash2
code = code.replace("import { Calendar, MapPin, Plus, User, CheckCircle2, Clock, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';", 
                    "import { Calendar, MapPin, Plus, User, CheckCircle2, Clock, Sparkles, ArrowRight, ExternalLink, Trash2 } from 'lucide-react';")

# 2. Add delete function
delete_fn = """
  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este evento?')) return;
    try {
      const res = await fetch(`/api/roadshows/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };
"""
code = code.replace("const fetchEvents = async () => {", delete_fn + "\n  const fetchEvents = async () => {")

# 3. Add Trash2 button next to the Summit Name
# We need to find where summitName is rendered
# Typical structure: <h3 className="text-xl font-bold text-white">{event.summitName}</h3>
search_h3 = '<h3 className="text-xl font-bold text-white">{event.summitName}</h3>'
replace_h3 = """<div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-white">{event.summitName}</h3>
                  <button onClick={(e) => handleDeleteEvent(event.id, e)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors" title="Eliminar Evento">
                    <Trash2 size={18} />
                  </button>
                </div>"""

if search_h3 in code:
    code = code.replace(search_h3, replace_h3)
else:
    print("Could not find h3 for summitName!")

with open('src/components/roadshows/RoadshowManager.tsx', 'w') as f:
    f.write(code)

print("Added delete functionality to RoadshowManager")
