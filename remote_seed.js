const fetch = require('node-fetch');

const events = [
    {
      name: 'Arcstone Toronto',
      city: 'Toronto',
      country: 'Canada',
      dates: 'September 16, 2026',
      boothNumber: 'TBD'
    },
    {
      name: 'Top Shelf Arizona Conference',
      city: 'Arizona',
      country: 'USA',
      dates: 'September 18-20, 2026',
      boothNumber: 'TBD'
    },
    {
      name: 'Ignite HK',
      city: 'Hong Kong',
      country: 'China',
      dates: 'October 14-15, 2026',
      boothNumber: 'TBD'
    },
    {
      name: 'PDAC 2026 International Convention',
      city: 'Toronto',
      country: 'Canadá',
      dates: '01 - 04 de Marzo, 2026',
      boothNumber: 'Metro Toronto Convention Centre - Stand #2408'
    },
    {
      name: 'Beaver Creek Precious Metals Summit',
      city: 'Beaver Creek, Colorado',
      country: 'EE. UU.',
      dates: '15 - 18 de Septiembre, 2026',
      boothNumber: 'Park Hyatt Beaver Creek - Tabla #14'
    }
];

async function seed() {
    for (const ev of events) {
        try {
            const res = await fetch('https://copper-giant-crm-3-ockham.wu48i0.easypanel.host/api/roadshows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ev)
            });
            const data = await res.json();
            console.log(data);
        } catch (e) {
            console.error(e);
        }
    }
}

seed();
