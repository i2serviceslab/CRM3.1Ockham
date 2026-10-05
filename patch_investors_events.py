import re

with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'r') as f:
    html = f.read()

# We need to add a script at the end of the body that fetches the events and updates the DOM
script = """
<!-- DYNAMIC CRM ROADSHOW EVENTS SCRIPT -->
<script>
document.addEventListener('DOMContentLoaded', async () => {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;

    try {
        const response = await fetch('https://copper-giant-crm-3-ockham.wu48i0.easypanel.host/api/roadshows?tenantId=coppergiant-silver');
        const data = await response.json();
        
        if (data.success && data.events && data.events.length > 0) {
            // Limpiar eventos quemados (hardcoded)
            eventsList.innerHTML = '';
            
            // Función auxiliar para parsear fechas estilo "15 - 18 de Septiembre, 2026" o "September 18, 2026"
            const parseMonth = (str) => {
                const s = str.toLowerCase();
                if (s.includes('jan') || s.includes('ene')) return { short: 'JAN', num: 0 };
                if (s.includes('feb')) return { short: 'FEB', num: 1 };
                if (s.includes('mar')) return { short: 'MAR', num: 2 };
                if (s.includes('apr') || s.includes('abr')) return { short: 'APR', num: 3 };
                if (s.includes('may')) return { short: 'MAY', num: 4 };
                if (s.includes('jun')) return { short: 'JUN', num: 5 };
                if (s.includes('jul')) return { short: 'JUL', num: 6 };
                if (s.includes('aug') || s.includes('ago')) return { short: 'AUG', num: 7 };
                if (s.includes('sep')) return { short: 'SEP', num: 8 };
                if (s.includes('oct')) return { short: 'OCT', num: 9 };
                if (s.includes('nov')) return { short: 'NOV', num: 10 };
                if (s.includes('dec') || s.includes('dic')) return { short: 'DEC', num: 11 };
                return { short: 'TBD', num: 0 };
            };

            const currentDate = new Date();

            data.events.forEach(ev => {
                // Extraer el primer número que veamos como día
                const dayMatch = ev.dates.match(/\d+/);
                const day = dayMatch ? dayMatch[0] : '01';
                const yearMatch = ev.dates.match(/\d{4}/);
                const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
                const monthInfo = parseMonth(ev.dates);
                
                // Determinar status (muy simple: si el año es menor, es pasado)
                const isPast = parseInt(year) < currentDate.getFullYear() || (parseInt(year) === currentDate.getFullYear() && monthInfo.num < currentDate.getMonth());
                const statusClass = isPast ? 'status-past' : 'status-next';
                const statusText = isPast ? 'Past Event' : 'Next Event';
                
                // Determinar tipo (Roadshow o Conference)
                let type = 'Conference';
                if (ev.name.toLowerCase().includes('roadshow')) type = 'Roadshow';
                
                const cardHtml = `
                <div class="event-card event-next" data-event-type="${type}" data-event-date="${year}-${String(monthInfo.num + 1).padStart(2, '0')}-${day.padStart(2, '0')}">
                    <div class="date-badge">
                        <span class="date-badge-month">${monthInfo.short}</span>
                        <span class="date-badge-day">${day}</span>
                        <span class="date-badge-year">${year}</span>
                    </div>
                    <div class="event-details">
                        <div class="event-meta-row">
                            <span class="event-type-pill">${type}</span>
                            <span class="event-status-badge ${statusClass}"><span class="status-dot"></span>${statusText}</span>
                        </div>
                        <h4 class="text-xl font-bold text-white mb-2">${ev.name}</h4>
                        <div class="flex flex-col md:flex-row flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                            <p class="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>
                                ${ev.dates}
                            </p>
                            <p class="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${ev.city}, ${ev.country}
                            </p>
                        </div>
                    </div>
                </div>`;
                
                eventsList.insertAdjacentHTML('beforeend', cardHtml);
            });
        }
    } catch (e) {
        console.error('Error syncing CRM events:', e);
    }
});
</script>
</body>
"""

if "DYNAMIC CRM ROADSHOW EVENTS SCRIPT" not in html:
    html = html.replace('</body>', script)
    with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'w') as f:
        f.write(html)
    print("Script injected into investors.html")
else:
    print("Script already present in investors.html")

# Do the same for index.html if events exist there
try:
    with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/index.html', 'r') as f:
        html_idx = f.read()
    if 'id="events-list"' in html_idx and "DYNAMIC CRM ROADSHOW EVENTS SCRIPT" not in html_idx:
        html_idx = html_idx.replace('</body>', script)
        with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/index.html', 'w') as f:
            f.write(html_idx)
        print("Script injected into index.html")
except:
    pass

