import re

with open('src/lib/themeEngine.ts', 'r') as f:
    content = f.read()

# Update DEFAULT_THEME_CONFIG to Copper Giant exact colors
old_default = """export const DEFAULT_THEME_CONFIG: CustomThemeConfig = {
  id: 'coppergiant-silver',
  name: 'Copper Giant Silver Official',
  primaryColor: '#FF002C',
  secondaryColor: '#a9aeb2',
  bgMain: '#0f172a',
  bgCard: '#1e2430',
  bgCardHover: '#282f40',
  bgCardInner: '#282f40',
  textColor: '#ffffff',
  textSecondary: '#a9aeb2',
  borderColor: '#334155',
  glowColor: '#FF002C',
  fontFamily: "'Urbanist', sans-serif",
  monoFontFamily: "'Space Grotesk', monospace",
  borderRadius: '24px',
  backdropBlur: '12px'
};"""

new_default = """export const DEFAULT_THEME_CONFIG: CustomThemeConfig = {
  id: 'coppergiant-official',
  name: 'Copper Giant Official',
  primaryColor: '#FF002C',
  secondaryColor: '#99001a',
  bgMain: '#000000',
  bgCard: '#111111',
  bgCardHover: '#181818',
  bgCardInner: '#181818',
  textColor: '#ffffff',
  textSecondary: '#a1a1a1',
  borderColor: '#333333',
  glowColor: '#FF002C',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  monoFontFamily: "'JetBrains Mono', monospace",
  borderRadius: '0px',
  backdropBlur: '4px'
};"""

content = content.replace(old_default, new_default)

# Force initTheme to ignore localStorage and always use Copper Giant theme
old_init = """export function initTheme(): CustomThemeConfig {
  if (typeof document === 'undefined') return DEFAULT_THEME_CONFIG;

  try {
    const savedConfig = localStorage.getItem('crm_theme_config');
    if (savedConfig) {
      const parsed: CustomThemeConfig = JSON.parse(savedConfig);
      applyThemeConfig(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Error loading theme config from storage:', err);
  }

  applyThemeConfig(DEFAULT_THEME_CONFIG);
  return DEFAULT_THEME_CONFIG;
}"""

new_init = """export function initTheme(): CustomThemeConfig {
  if (typeof document === 'undefined') return DEFAULT_THEME_CONFIG;
  // Always force official Copper Giant branding, ignoring legacy localStorage caches
  applyThemeConfig(DEFAULT_THEME_CONFIG);
  return DEFAULT_THEME_CONFIG;
}"""

content = content.replace(old_init, new_init)

with open('src/lib/themeEngine.ts', 'w') as f:
    f.write(content)
