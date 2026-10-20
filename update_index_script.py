import re

with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/index.html', 'r') as f:
    html = f.read()

old_logic = """                // Determinar status (muy simple: si el año es menor, es pasado)
                const isPast = parseInt(year) < currentDate.getFullYear() || (parseInt(year) === currentDate.getFullYear() && monthInfo.num < currentDate.getMonth());
                const statusClass = isPast ? 'status-past' : 'status-next';
                const statusText = isPast ? 'Past Event' : 'Next Event';"""

new_logic = """                // Determinar status (muy simple: si el año es menor, es pasado)
                const isPast = parseInt(year) < currentDate.getFullYear() || (parseInt(year) === currentDate.getFullYear() && monthInfo.num < currentDate.getMonth());
                if (isPast) return; // <-- AUTOMATICALLY HIDE PAST EVENTS
                
                const statusClass = 'status-next';
                const statusText = 'Next Event';"""

if old_logic in html:
    html = html.replace(old_logic, new_logic)
    print("Updated index.html script to hide past events")
    with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/index.html', 'w') as f:
        f.write(html)
else:
    print("No old logic in index.html")
