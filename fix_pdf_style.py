import re

with open('src/app/globals.css', 'r') as f:
    css = f.read()

target = """@media print {
  @page {
    margin: 1.5cm;
    size: auto;
  }"""

new_css = """@media print {
  @page {
    margin: 0cm !important;
    size: auto;
  }"""

css = css.replace(target, new_css)

target2 = """  #print-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background-color: white !important;
    color: black !important;
  }"""

new2 = """  #print-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 2cm 2cm 2cm 2cm;
    background-color: white !important;
    color: black !important;
  }"""

css = css.replace(target2, new2)

with open('src/app/globals.css', 'w') as f:
    f.write(css)

print("CSS updated for zero-margin page")
