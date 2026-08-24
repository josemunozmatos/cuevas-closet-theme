/**
 * Lightweight PDP feature click tracking.
 * Fires Shopify custom events (for Customer events / custom pixels)
 * and gtag/dataLayer when available (for GA4).
 *
 * Events:
 * - size_guide_click
 * - similar_styles_click
 */
(function () {
  function publish(eventName, params) {
    try {
      if (window.Shopify && Shopify.analytics && typeof Shopify.analytics.publish === 'function') {
        Shopify.analytics.publish(eventName, params);
      }
    } catch (e) {}

    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: eventName }, params));
    } catch (e) {}

    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
    } catch (e) {}
  }

  function productParams(el) {
    var root = el.closest('[data-product-id]') || el.closest('.js-product') || document.querySelector('.js-product');
    var params = {
      page_path: window.location.pathname
    };

    if (root) {
      if (root.dataset.productId) params.product_id = root.dataset.productId;
      if (root.dataset.productHandle) params.product_handle = root.dataset.productHandle;
      if (root.dataset.productType) params.product_type = root.dataset.productType;
    }

    if (el.dataset.productId) params.product_id = el.dataset.productId;
    if (el.dataset.productHandle) params.product_handle = el.dataset.productHandle;
    if (el.dataset.productType) params.product_type = el.dataset.productType;
    if (el.dataset.destination) params.destination = el.dataset.destination;

    return params;
  }

  document.addEventListener(
    'click',
    function (event) {
      var sizeGuide = event.target.closest('.size-chart-link, [data-track="size_guide_click"]');
      if (sizeGuide) {
        publish('size_guide_click', productParams(sizeGuide));
        return;
      }

      var similar = event.target.closest('.similar-styles-banner__link, [data-track="similar_styles_click"]');
      if (similar) {
        var params = productParams(similar);
        if (!params.destination && similar.getAttribute('href')) {
          params.destination = similar.getAttribute('href');
        }
        publish('similar_styles_click', params);
      }
    },
    true
  );
})();
