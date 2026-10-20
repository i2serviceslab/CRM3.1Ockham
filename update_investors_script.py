import re

with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'r') as f:
    html = f.read()

# We need to replace the inner script logic. 
# Look for "const isPast =" and change how it handles it.
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
    print("Updated investors.html script to hide past events")
    with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'w') as f:
        f.write(html)
else:
    print("Could not find old logic block in investors.html")
