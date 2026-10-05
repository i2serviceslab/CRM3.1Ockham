import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

# I will replace everything from @media print { to the end
parts = css.split('@media print {')
new_css = parts[0] + """@media print {
  body * {
    visibility: hidden;
  }
  #printable-meeting-result, #printable-meeting-result * {
    visibility: visible;
  }
  #printable-meeting-result {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  /* Force dark theme elements to look good on white paper */
  #printable-meeting-result * {
    color: black !important;
    background-color: transparent !important;
    border-color: #ccc !important;
    box-shadow: none !important;
  }
  
  /* Remove scrolling and max heights so the full text renders */
  #printable-meeting-result .overflow-y-auto,
  #printable-meeting-result .max-h-\\[400px\\] {
    overflow: visible !important;
    max-height: none !important;
  }
  
  /* Page break rules for paragraphs to avoid cutting text in half */
  #printable-meeting-result p, 
  #printable-meeting-result li {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Force grid into a block stack so columns don't squish */
  #printable-meeting-result.grid,
  #printable-meeting-result .grid {
    display: block !important;
  }
  
  #printable-meeting-result > div {
    margin-bottom: 2rem;
  }
}
"""

with open('src/app/globals.css', 'w') as f:
    f.write(new_css)

print("Rewrote print CSS")
