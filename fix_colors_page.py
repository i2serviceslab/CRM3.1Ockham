import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

bad_block = """  useEffect(() => {
    if (selectedTenant) {
      setBrandName(selectedTenant.name || 'Copper Giant');
      if (selectedTenant.logoUrl) setBrandLogo(selectedTenant.logoUrl);
      if (selectedTenant.primaryColor) {
        setPrimaryColor(selectedTenant.primaryColor);
        document.documentElement.style.setProperty('--primary-color', selectedTenant.primaryColor);
      }
    }
  }, [selectedTenant]);"""

good_block = """  useEffect(() => {
    if (selectedTenant) {
      // Branding is now hardcoded to Copper Giant
      document.documentElement.style.setProperty('--accent-primary', '#FF002C');
      document.documentElement.style.setProperty('--primary-color', '#FF002C');
    }
  }, [selectedTenant]);"""

content = content.replace(bad_block, good_block)

# Also fix the subtitle text "Selecciona una empresa desde la Consola Maestra para comenzar."
content = content.replace("Selecciona una empresa desde la Consola Maestra para comenzar.", "Gestiona tus contactos, relaciones e inversores en tiempo real.")

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
