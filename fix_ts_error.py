import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

# Replace all instances of `sentences.forEach(s => {` with `sentences.forEach((s: string) => {`
tsx = tsx.replace('sentences.forEach(s => {', 'sentences.forEach((s: string) => {')

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("TypeScript error fixed!")
