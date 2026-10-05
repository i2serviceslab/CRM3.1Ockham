import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

target = """@media print {
  @page {
    margin: 0cm !important;
    size: auto;
  }
  
  body * {
    visibility: hidden;
  }
  
  #print-document, #print-document * {
    visibility: visible;
  }
  
  #print-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 2cm 2cm 2cm 2cm;
    background-color: white !important;
    color: black !important;
  }"""

new_print = """@media print {
  @page {
    margin: 0cm !important;
    size: auto;
  }
  
  /* Hide all elements from the layout flow entirely */
  body * {
    display: none !important;
  }
  
  /* Reveal the print document and its direct ancestors so the tree renders */
  body, html, main, div:has(> #print-document), div:has(> div > #print-document), div:has(#print-document) {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  
  /* Render the print document and its children normally */
  #print-document, #print-document * {
    display: block !important;
    visibility: visible !important;
  }

  /* Exceptions for inline elements inside the print document so they don't break lines */
  #print-document span, #print-document strong, #print-document img {
    display: inline-block !important;
  }
  #print-document ul, #print-document li {
    display: list-item !important;
  }
  #print-document .flex {
    display: flex !important;
  }
  
  #print-document {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 21cm !important; /* A4 width roughly */
    margin: 0 auto !important;
    padding: 2cm !important;
    background-color: white !important;
    color: black !important;
    box-sizing: border-box !important;
  }"""

css = css.replace(target, new_print)

with open('src/app/globals.css', 'w') as f:
    f.write(css)

# Now fix the logo invert in MeetingRecorder.tsx
with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

# Change `print:invert` to `print:brightness-0` to make the logo completely black (no cyan)
tsx = tsx.replace('print:invert', 'print:brightness-0')

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("CSS updated for display: none and brightness-0")
