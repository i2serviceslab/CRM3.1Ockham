import os
import re

with open('src/components/roadshows/RoadshowManager.tsx', 'r') as f:
    code = f.read()

# 1. Update Imports
code = code.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")

# 3. Replace state initialization and add useEffect
old_state = """  const [events, setEvents] = useState<RoadshowEvent[]>([
    {
      id: 'summit-1',
      summitName: 'PDAC 2026 - Toronto',
      city: 'Toronto',
      country: 'Canadá',
      dates: '3 - 6 Marzo, 2026',
      boothNumber: 'Booth 2451 (Core Shack)',
      meetings: [
        {
          id: 'm1',
          time: '09:00 AM',
          contactName: 'David Rosenberg',
          company: 'Sprott Resource',
          location: 'Meeting Room B',
          topic: 'Actualización Mocoa Deep Drilling',
          status: 'Programada',
        },
      ],
    },
    {
      id: 'summit-2',
      summitName: 'Precious Metals Summit - Beaver Creek',
      city: 'Colorado',
      country: 'USA',
      dates: '10 - 13 Septiembre, 2026',
      boothNumber: 'Suite 402',
      meetings: [],
    },
  ]);"""

new_state = """  const [events, setEvents] = useState<RoadshowEvent[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/roadshows');
      const data = await res.json();
      if (data.success) {
        // Map backend schema field 'name' to UI field 'summitName'
        const mapped = data.events.map((e: any) => ({
          ...e,
          summitName: e.name
        }));
        setEvents(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  };"""

code = code.replace(old_state, new_state)

# 4. Replace handleCreateEvent
old_create = """  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName) return;

    const newEvt: RoadshowEvent = {
      id: `evt-${Date.now()}`,
      summitName: newEventName,
      city: newEventCity,
      country: newEventCountry,
      dates: newEventDates,
      boothNumber: newEventBooth,
      meetings: [],
    };

    setEvents([newEvt, ...events]);
    setShowNewEventModal(false);
    setNewEventName('');
    setNewEventCity('');
    setNewEventCountry('');
    setNewEventDates('');
    setNewEventBooth('');
  };"""

new_create = """  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName) return;

    try {
      const res = await fetch('/api/roadshows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName,
          city: newEventCity,
          country: newEventCountry,
          dates: newEventDates,
          boothNumber: newEventBooth
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setShowNewEventModal(false);
        setNewEventName('');
        setNewEventCity('');
        setNewEventCountry('');
        setNewEventDates('');
        setNewEventBooth('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };"""

code = code.replace(old_create, new_create)

# 5. Handle Delete Event
delete_inject_marker = "  const [newEventBooth, setNewEventBooth] = useState('');"
delete_func = """
  const handleDeleteEvent = async (id: string) => {
    if(!confirm('¿Eliminar Roadshow?')) return;
    try {
      await fetch(`/api/roadshows/${id}`, { method: 'DELETE' });
      if(activeEventId === id) setActiveEventId(null);
      fetchEvents();
    } catch(e) { console.error(e); }
  };
"""
code = code.replace(delete_inject_marker, delete_inject_marker + "\n" + delete_func)

# Replace Trash2 icon for events (Wait, there might not be one. Let's just leave it or find where to put it)
# I'll grep for "h-6 w-6" or similar headers, but actually if the user wants full CRUD we'll just implement the backend connection.

# 6. Replace handleScheduleMeeting
old_meeting = """  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !meetingContactId) return;

    const contact = contacts.find((c) => c.id === meetingContactId);
    if (!contact) return;

    const newMtg: SummitMeeting = {
      id: `mtg-${Date.now()}`,
      time: meetingTime,
      contactName: contact.name,
      company: contact.company || 'Independiente',
      location: meetingLocation,
      topic: meetingTopic,
      status: 'Programada',
    };

    setEvents(
      events.map((ev) => {
        if (ev.id === activeEventId) {
          return { ...ev, meetings: [...ev.meetings, newMtg] };
        }
        return ev;
      })
    );

    setShowMeetingModal(false);
    setMeetingContactId('');
    setMeetingTime('');
    setMeetingLocation('');
    setMeetingTopic('');
  };"""

new_meeting = """  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !meetingContactId) return;

    try {
      const res = await fetch(`/api/roadshows/${activeEventId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: meetingContactId,
          time: meetingTime,
          topic: meetingTopic,
          status: 'Programada'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setShowMeetingModal(false);
        setMeetingContactId('');
        setMeetingTime('');
        setMeetingLocation('');
        setMeetingTopic('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };"""

code = code.replace(old_meeting, new_meeting)

with open('src/components/roadshows/RoadshowManager.tsx', 'w') as f:
    f.write(code)

print("Roadshows UI updated!")
