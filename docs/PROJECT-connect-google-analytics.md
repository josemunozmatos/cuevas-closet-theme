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

## Decision (based on storefront evidence)
**Use `G-EDY692RPV2` as source of truth for now.**  
It is the Measurement ID present on the storefront. `G-3LLH2JC738` is an empty/unwired property.

In GA, open the property whose Admin → Data streams → Measurement ID is `G-EDY692RPV2` (may be under a different account than the empty `www.shopcuevascloset.com` property).

Custom pixel draft updated to `G-EDY692RPV2`.

## Still blocked on Jose
- [ ] In GA: find/open the property for `G-EDY692RPV2` (confirm it has traffic)
- [ ] Paste + Connect custom pixel from `docs/custom-pixel-pdp-feature-clicks.js`
  - Permission: Required → Analytics only
  - Data sale: does not qualify
- [ ] Confirm `size_guide_click` + `similar_styles_click` in GA4 Realtime
- [ ] Optional later: retire or properly tag `G-3LLH2JC738` so it isn’t confusing

## Event names to verify
- `size_guide_click`
- `similar_styles_click`

## Where to look in GA4
- Realtime (immediate test)
- Reports → Engagement → Events (daily counts)
