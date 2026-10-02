import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

if "@media print" not in css:
    css += """

@media print {
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
    color: black !important;
  }
  /* Force dark theme elements to look good on white paper */
  #printable-meeting-result .bg-[#1E293B] {
    background-color: white !important;
    border: 1px solid #ccc !important;
    color: black !important;
  }
  #printable-meeting-result .text-gray-400 {
    color: #555 !important;
  }
  #printable-meeting-result .text-white {
    color: black !important;
  }
}
"""
    with open('src/app/globals.css', 'w') as f:
        f.write(css)
    print("Added print CSS")
