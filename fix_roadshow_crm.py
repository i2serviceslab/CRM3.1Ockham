import re

with open('src/components/roadshows/RoadshowManager.tsx', 'r') as f:
    code = f.read()

# 1. Update imports
if "useEffect" not in code:
    code = code.replace("import React, { useState }", "import React, { useState, useEffect }")

# 2. Add fetch logic and replace static state
target_state = """  const [events, setEvents] = useState<RoadshowEvent[]>([
    {
      id: 'summit-1',
      summitName: 'PDAC 2026 International Convention',
      city: 'Toronto',
      country: 'Canadá',
      dates: '01 - 04 de Marzo, 2026',
      boothNumber: 'Metro Toronto Convention Centre - Stand #2408',
      meetings: [
        {
          id: 'm-1',
          time: '09:30 AM',
          contactName: 'Michael Sterling',
          company: 'Sterling Family Office',
          location: 'Meeting Room B',
          topic: 'Revisión de resultados de leyes de plata en Santa Ana',
          status: 'Completada',
        },
        {
          id: 'm-2',
          time: '02:00 PM',
          contactName: 'Elena Rostova',
          company: 'Rostova Capital Mining Fund',
          location: 'Booth VIP Area',
          topic: 'Presentación del modelo de bloques y estimación de recursos',
          status: 'Programada',
        },
      ],
    },
    {
      id: 'summit-2',
      summitName: 'Beaver Creek Precious Metals Summit',
      city: 'Beaver Creek, Colorado',
      country: 'EE. UU.',
      dates: '15 - 18 de Septiembre, 2026',
      boothNumber: 'Park Hyatt Beaver Creek - Tabla #14',
      meetings: [
        {
          id: 'm-3',
          time: '11:00 AM',
          contactName: 'Patricia Gomez',
          company: 'Gomez Global Mining Brokers',
          location: 'Lobby Lounge',
          topic: 'Estrategia de distribución institucional de colocación privada',
          status: 'Seguimiento Enviado',
        },
      ],
    },
  ]);"""

replacement_state = """  const [events, setEvents] = useState<RoadshowEvent[]>([]);
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
        // Map backend schema to frontend schema
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
  };"""

code = code.replace(target_state, replacement_state)

# Fix Create Event POST
target_post = """    const newEvent: RoadshowEvent = {
      id: `summit-${Date.now()}`,
      summitName: name,
      city,
      country,
      dates,
      boothNumber,
      meetings: [],
    };
    setEvents([newEvent, ...events]);"""

replacement_post = """    try {
      const res = await fetch('/api/roadshows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, country, dates, boothNumber })
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
      }
    } catch (e) {
      console.error('Error creating event:', e);
    }"""

code = code.replace(target_post, replacement_post)

with open('src/components/roadshows/RoadshowManager.tsx', 'w') as f:
    f.write(code)

print("Roadshow CRM UI updated to use API!")
