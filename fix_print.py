import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

# Remove old print css
css = re.sub(r'@media print\s*{[^}]+}\s*}?', '', css, flags=re.DOTALL) # This regex might be tricky if nested, let's just do a string replace since we know how we added it.
