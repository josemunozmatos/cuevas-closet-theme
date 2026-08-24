/**
 * PASTE THIS into Shopify Admin → Settings → Customer events → Add custom pixel
 * Name it: "PDP feature clicks → GA4"
 *
 * After saving, click the pixel → Connect.
 *
 * Events in GA4 (G-EDY692RPV2 — ID currently present on the storefront):
 * - size_guide_click
 * - similar_styles_click
 *
 * See clicks: GA4 → Reports → Engagement → Events (or Realtime to test).
 *
 * NOTE: Property G-3LLH2JC738 showed “No data received” and is NOT the ID
 * currently injected on the Cuevas Closet storefront. Prefer G-EDY692RPV2
 * unless you intentionally re-tag the store to G-3LLH2JC738.
 */

const GA_MEASUREMENT_ID = 'G-EDY692RPV2';

(function initGtag() {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  // Pageviews stay with Shopify's Google channel — this pixel only sends feature clicks
  gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
})();

function sendGaEvent(eventName, customData) {
  const params = Object.assign(
    {
      event_category: 'pdp_features'
    },
    customData || {}
  );

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

analytics.subscribe('size_guide_click', (event) => {
  sendGaEvent('size_guide_click', event.customData);
});

analytics.subscribe('similar_styles_click', (event) => {
  sendGaEvent('similar_styles_click', event.customData);
});
