import os
import re

# 1. Update FinancialTickerWidget.tsx
with open('src/components/analytics/FinancialTickerWidget.tsx', 'r') as f:
    widget_code = f.read()

old_defaults = """const DEFAULT_TICKERS: TickerData[] = [
  { symbol: 'TSXV: CGNT', name: 'Copper Giant Inc (TSX.V)', price: 1.28, change: 0.02, changePercent: 1.59, isPositive: true },
  { symbol: 'OTC: LBCMF', name: 'Copper Giant (OTC)', price: 0.92, change: 0.01, changePercent: 0.70, isPositive: true },
  { symbol: 'FSE: 29H0', name: 'Copper Giant (Frankfurt)', price: 0.75, change: -0.001, changePercent: -0.13, isPositive: false },
  { symbol: 'Cu', name: 'Copper Spot', price: 6.70, change: 0.10, changePercent: 1.51, volume: '$/Lb', isPositive: true },
  { symbol: 'COPJ', name: 'Sprott Junior Copper Miners ETF', price: 48.23, change: -0.58, changePercent: -1.20, isPositive: false },
];"""

new_defaults = """const DEFAULT_TICKERS: TickerData[] = [
  { symbol: 'TSXV: OCG', name: 'Copper Giant (TSX.V)', price: 0.00, change: 0.00, changePercent: 0.00, isPositive: true },
  { symbol: 'OTCQX: OCGSF', name: 'Copper Giant (OTCQX)', price: 0.00, change: 0.00, changePercent: 0.00, isPositive: true },
  { symbol: 'Cu', name: 'Copper Spot', price: 0.00, change: 0.00, changePercent: 0.00, volume: '$/Lb', isPositive: true },
  { symbol: 'Ag', name: 'Silver Spot', price: 0.00, change: 0.00, changePercent: 0.00, volume: '$/Oz', isPositive: true },
  { symbol: 'COPJ', name: 'Sprott Junior Copper ETF', price: 0.00, change: 0.00, changePercent: 0.00, isPositive: true },
];"""

widget_code = widget_code.replace(old_defaults, new_defaults)

old_map = """      const symbolMap: Record<string, string> = {
        'TSXV: CGNT': 'CGNT.V',
        'OTC: LBCMF': 'LBCMF',
        'FSE: 29H0': '29H0.F',
        'Cu': 'HG=F',
        'COPJ': 'COPJ',
        'XAG/USD': 'SI=F',
        'XAU/USD': 'GC=F',
        'OCG.V': 'OCG.V',
        'OCGSF': 'OCGSF',
      };"""

new_map = """      const symbolMap: Record<string, string> = {
        'TSXV: OCG': 'OCG.V',
        'OTCQX: OCGSF': 'OCGSF',
        'Cu': 'HG=F',
        'Ag': 'SI=F',
        'Au': 'GC=F',
        'COPJ': 'COPJ',
      };"""

widget_code = widget_code.replace(old_map, new_map)

# Also force override the localStorage for the user because their browser might have saved the old DEFAULT_TICKERS in the 'crm_tenant_market_tickers' cookie or localStorage.
# We will inject a cleanup line inside useEffect
old_useeffect = """  useEffect(() => {
    // 1. Initial Load of Presets"""

new_useeffect = """  useEffect(() => {
    // 1. Initial Load of Presets
    localStorage.removeItem('crm_tenant_market_tickers'); // Force reset old mock tickers
    document.cookie = "crm_tenant_market_tickers=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
"""

widget_code = widget_code.replace(old_useeffect, new_useeffect)

with open('src/components/analytics/FinancialTickerWidget.tsx', 'w') as f:
    f.write(widget_code)


# 2. Update api/market/quotes/route.ts
with open('src/app/api/market/quotes/route.ts', 'r') as f:
    api_code = f.read()

# Replace hardcoded symbols
old_api_defaults = "const rawSymbols = searchParams.get('symbols') || 'CGNT.V,LBCMF,29H0.F,HG=F,COPJ';"
new_api_defaults = "const rawSymbols = searchParams.get('symbols') || 'OCG.V,OCGSF,HG=F,SI=F,COPJ';"
api_code = api_code.replace(old_api_defaults, new_api_defaults)

# Replace the catch block to return 0 instead of fake numbers
old_catch = """      } catch (err: any) {
        console.warn(`Failed to fetch real market quote for ${sym}:`, err?.message || err);
        const metaConfig = SYMBOL_META[sym] || { label: sym, name: sym };
        const nativeCurrency = sym === 'CGNT.V' ? 'CAD' : sym === '29H0.F' ? 'EUR' : 'USD';
        quote = {
          symbol: metaConfig.label || sym,
          name: metaConfig.name,
          price: sym === 'CGNT.V' ? 1.28 : sym === 'LBCMF' ? 0.92 : sym === '29H0.F' ? 0.75 : sym === 'HG=F' ? 6.70 : sym === 'COPJ' ? 48.23 : 30.25,
          change: 0.02,
          changePercent: 1.59,
          currency: nativeCurrency,
          currencySymbol: getCurrencySymbol(nativeCurrency),
          exchangeLabel: metaConfig.label || sym,
          isPositive: true,
          volume: metaConfig.unit,
          lastUpdated: new Date().toISOString(),
        };
      }"""

new_catch = """      } catch (err: any) {
        console.warn(`Failed to fetch real market quote for ${sym}:`, err?.message || err);
        const metaConfig = SYMBOL_META[sym] || { label: sym, name: sym };
        const nativeCurrency = sym === 'OCG.V' ? 'CAD' : 'USD';
        quote = {
          symbol: metaConfig.label || sym,
          name: metaConfig.name,
          price: 0,
          change: 0,
          changePercent: 0,
          currency: nativeCurrency,
          currencySymbol: getCurrencySymbol(nativeCurrency),
          exchangeLabel: metaConfig.label || sym,
          isPositive: true,
          volume: metaConfig.unit,
          lastUpdated: new Date().toISOString(),
        };
      }"""

api_code = api_code.replace(old_catch, new_catch)

with open('src/app/api/market/quotes/route.ts', 'w') as f:
    f.write(api_code)

print("Tickers Updated!")
