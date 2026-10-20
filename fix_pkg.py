import json

with open('package.json', 'r') as f:
    text = f.read()

# Since it's malformed, we can just replace the bad line via regex or hardcoded string
import re

bad_line = '"start": "npx prisma db push --accept-data-loss "start": "npx prisma db push --accept-data-loss && next start""start": "npx prisma db push --accept-data-loss && next start" node scripts/seed_roadshows.js "start": "npx prisma db push --accept-data-loss && next start""start": "npx prisma db push --accept-data-loss && next start" next start",'
good_line = '"start": "npx prisma db push --accept-data-loss && node scripts/seed_roadshows.js && next start",'

fixed_text = text.replace(bad_line, good_line)

with open('package.json', 'w') as f:
    f.write(fixed_text)

print("Fixed package.json")
