import re
from bs4 import BeautifulSoup

with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'r') as f:
    html = f.read()

# We can just extract them manually to a JSON string if bs4 is available
try:
    soup = BeautifulSoup(html, 'html.parser')
    cards = soup.find_all('div', class_='event-card')
    out = []
    for c in cards:
        title_el = c.find('h4')
        if not title_el or '$' in title_el.text: continue
        title = title_el.text.strip()
        
        # The paragraphs have SVG. We can extract the text inside.
        ps = c.find_all('p')
        date_str = ps[0].text.strip() if len(ps) > 0 else 'TBD'
        loc_str = ps[1].text.strip() if len(ps) > 1 else 'TBD'
        
        # Split location to city and country
        parts = [p.strip() for p in loc_str.split(',')]
        city = parts[0]
        country = parts[1] if len(parts) > 1 else ''
        
        out.append({
            'name': title,
            'city': city,
            'country': country,
            'dates': date_str,
            'boothNumber': 'TBD'
        })
    print(out)
except Exception as e:
    print(e)
