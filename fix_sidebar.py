import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# Fix the broken div/img tag block
broken_block = """onClick={() => document.getElementById('sidebar-logo-file-input')?.click()}
          >
            <img
              src="/logo.svg"
              alt="Brand Logo"
              className="h-7 w-auto object-contain transition-transform duration-200 hover:scale-105 shrink-0"
            title="Haz clic para cambiar el logo corporativo"
          >
            <img
              src={currentLogo}
              alt="Brand Logo"
              className="h-8 w-auto object-contain transition-transform duration-200 hover:scale-105 shrink-0"
            />"""

fixed_block = """onClick={() => document.getElementById('sidebar-logo-file-input')?.click()}
            title="Haz clic para cambiar el logo corporativo"
          >
            <img
              src="/logo.svg"
              alt="Brand Logo"
              className="h-8 w-auto object-contain transition-transform duration-200 hover:scale-105 shrink-0"
            />"""

content = content.replace(broken_block, fixed_block)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
