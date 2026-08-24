/**
 * Lightweight PDP feature click tracking.
 * - Publishes Shopify custom events (for Customer events / custom pixels)
 * - Also sends to GA4 G-EDY692RPV2 when analytics consent allows
 *   (Shopify's GA channel is sandboxed, so theme gtag is needed for custom clicks)
 *
 * Events:
 * - size_guide_click
 * - similar_styles_click
 */
(function () {
  var GA_MEASUREMENT_ID = 'G-EDY692RPV2';
  var gtagReady = false;
  var gtagLoading = false;

  function ensureGtag(done) {
    if (gtagReady) {
      done();
      return;
    }
    if (gtagLoading) {
      var tries = 0;
      var t = setInterval(function () {
        tries += 1;
        if (gtagReady || tries > 40) {
          clearInterval(t);
          done();
        }
      }, 50);
      return;
    }
    gtagLoading = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    script.onload = function () {
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
      gtagReady = true;
      done();
    };
    script.onerror = function () {
      gtagLoading = false;
      done();
    };
    document.head.appendChild(script);
  }

  function withAnalyticsConsent(run) {
    try {
      if (window.Shopify && typeof Shopify.loadFeatures === 'function') {
        Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], function (err) {
          if (err || !Shopify.customerPrivacy) {
            run();
            return;
          }
          if (Shopify.customerPrivacy.analyticsProcessingAllowed()) {
            run();
            return;
          }
          document.addEventListener('visitorConsentCollected', function () {
            if (Shopify.customerPrivacy.analyticsProcessingAllowed()) run();
          });
        });
        return;
      }
    } catch (e) {}
    run();
  }

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

    withAnalyticsConsent(function () {
      ensureGtag(function () {
        try {
          if (typeof window.gtag === 'function') {
            window.gtag(
              'event',
              eventName,
              Object.assign({ event_category: 'pdp_features', send_to: GA_MEASUREMENT_ID }, params)
            );
          }
        } catch (e) {}
      });
    });
  }

  function productParams(el) {
    var root =
      el.closest('[data-product-id]') || el.closest('.js-product') || document.querySelector('.js-product');
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
