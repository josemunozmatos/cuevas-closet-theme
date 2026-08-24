# Project: Connect Google Analytics properly (Cuevas Closet)

Status: **Paused — resume later**  
Saved: Aug 24, 2026

## Goal
Get GA4 receiving real store traffic + PDP feature clicks (`size_guide_click`, `similar_styles_click`) in the property Jose actually looks at.

## Known mismatch (root cause)
| Source | Measurement ID |
|---|---|
| GA property Jose opened (`www.shopcuevascloset.com`) — shows “No data received” | `G-3LLH2JC738` |
| ID found on the live/preview storefront | `G-EDY692RPV2` |

Shopify Customer events already has **Google Analytics tag (migrated)** connected — likely pointed at `G-EDY692RPV2` or another property.

## Already done
- [x] `assets/pdp-feature-tracking.js` — fires Shopify custom events on Size guide + Mira estilos similares
- [x] Wired on product pages via `layout/theme.liquid`
- [x] Data attributes on size guide button + similar styles link
- [x] Paste-ready custom pixel draft: `docs/custom-pixel-pdp-feature-clicks.js` (set to `G-3LLH2JC738`)
- [x] Theme tracking **pushed to GitHub `main`** (Aug 24, 2026)

## Still blocked on Jose
- [ ] Pick source-of-truth Measurement ID (`G-3LLH2JC738` vs `G-EDY692RPV2`)
- [ ] Align Shopify Google Analytics channel with that ID
- [ ] Paste + Connect custom pixel in Customer events
- [ ] Confirm events in GA4 Realtime

## Event names to verify
- `size_guide_click`
- `similar_styles_click`

## Where to look in GA4
- Realtime (immediate test)
- Reports → Engagement → Events (daily counts)
