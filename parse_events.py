import re

with open('/Users/i2carvajal/Documents/Proyectos/CopperWeb/proposal/investors.html', 'r') as f:
    html = f.read()

events = []
# Find all <h4 class="text-xl font-bold text-white mb-2">TITLE</h4>
# Find dates
# Find locations

titles = re.findall(r'<h4 class="text-xl font-bold text-white mb-2">(.*?)</h4>', html)
# This includes the dynamic template one `${ev.name}`, we should exclude it
titles = [t for t in titles if '$' not in t]

print(titles)
