import re

with open('src/components/roadshows/RoadshowManager.tsx', 'r') as f:
    code = f.read()

# Let's replace everything from `const [events, setEvents] = useState<RoadshowEvent[]>([`
# down to `  const [showCreateModal, setShowCreateModal] = useState(false);`
import re

pattern = re.compile(r'const \[events, setEvents\] = useState<RoadshowEvent\[\]>\(\[.*?\]\);', re.DOTALL)

replacement = """const [events, setEvents] = useState<RoadshowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roadshows');
      const data = await res.json();
      if (data.success && data.events) {
        const formatted = data.events.map((e: any) => ({
          id: e.id,
          summitName: e.name,
          city: e.city,
          country: e.country,
          dates: e.dates,
          boothNumber: e.boothNumber,
          meetings: e.meetings?.map((m: any) => ({
            id: m.id,
            time: m.time,
            contactName: m.contact?.name || m.contactName,
            company: m.contact?.company || m.company,
            location: m.location,
            topic: m.topic,
            status: m.status,
          })) || []
        }));
        setEvents(formatted);
      }
    } catch (error) {
      console.error('Error fetching roadshows:', error);
    } finally {
      setLoading(false);
    }
  };

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

code = pattern.sub(replacement, code)

# Let's also fix handleCreateEvent
pattern_create = re.compile(r'const newEvent: RoadshowEvent = {.*?setEvents\(\[newEvent, \.\.\.events\]\);', re.DOTALL)

replacement_create = """try {
      const res = await fetch('/api/roadshows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: summitName, city, country, dates, boothNumber })
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error('Error creating event:', e);
    }"""

code = pattern_create.sub(replacement_create, code)

with open('src/components/roadshows/RoadshowManager.tsx', 'w') as f:
    f.write(code)

print("RoadshowManager fixed!")
