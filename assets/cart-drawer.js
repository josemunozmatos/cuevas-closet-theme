/* global SideDrawer */

const CART_DRAWER_STORAGE_DISCOUNT = 'cart-drawer-discount-open';

/**
 * Bind once per page load — survives cart-drawer disconnect/reconnect
 * after section merges so the nav cart icon never falls through to /cart.
 */
function ensureGlobalCartDrawerOpeners() {
  if (window.__cuevasCartDrawerOpenersBound) return;
  window.__cuevasCartDrawerOpenersBound = true;

  const getDrawer = () => document.querySelector('cart-drawer.js-cart-drawer, cart-drawer, .js-cart-drawer');

  document.addEventListener(
    'click',
    (evt) => {
      if (!window.theme || !theme.settings || theme.settings.cartType !== 'drawer') return;
      if (evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.button === 1) return;
      const link = evt.target.closest && evt.target.closest('a.cart-link');
      if (!link) return;
      const drawer = getDrawer();
      if (!drawer || typeof drawer.open !== 'function') return;
      evt.preventDefault();
      evt.stopPropagation();
      drawer.open(link);
    },
    true
  );

  document.addEventListener('theme:open-cart-drawer', (evt) => {
    const drawer = getDrawer();
    if (!drawer || typeof drawer.open !== 'function') return;
    drawer.open(evt.detail && evt.detail.opener ? evt.detail.opener : null);
  });

  document.addEventListener('dispatch:cart-drawer:open', (evt) => {
    const drawer = getDrawer();
    if (!drawer || typeof drawer.open !== 'function') return;
    drawer.open(evt.detail && evt.detail.opener ? evt.detail.opener : null);
  });
}

ensureGlobalCartDrawerOpeners();

class CartDrawer extends SideDrawer {
  connectedCallback() {
    this.bindEvents();
    this.initDiscountForm();
    this.initSizeEditor();
    ensureGlobalCartDrawerOpeners();
  }

  bindEvents() {
    this.cartRefreshHandler = this.cartRefreshHandler.bind(this);
    this.closeDrawerViaEventHandler = this.close.bind(this, null);
    document.addEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    document.addEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
    this.addEventListener('on:cart-drawer:before-open', () => {
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
    });
    this.addEventListener('on:cart:after-merge', () => {
      theme.manuallyLoadImages(this);
      this.querySelectorAll('cc-cart-cross-sell').forEach((el) => el.init());
      this.initDiscountForm();
    });
  }

  disconnectedCallback() {
    document.removeEventListener('dispatch:cart-drawer:refresh', this.cartRefreshHandler);
    document.removeEventListener('dispatch:cart-drawer:close', this.closeDrawerViaEventHandler);
  }

  cartRefreshHandler() {
    const cartForm = this.querySelector('cart-form');
    if (cartForm && typeof cartForm.refresh === 'function') cartForm.refresh();
  }

  updateFromCartChange(html) {
    const cartForm = this.querySelector('cart-form');
    if (cartForm && typeof cartForm.refreshFromHtml === 'function') {
      cartForm.refreshFromHtml(html);
    }
  }

  initDiscountForm() {
    this.initDiscountAccordion();

    const wrap = this.querySelector('.js-discount-wrapper');
    const input = this.querySelector('.js-discount-input');
    const btn = this.querySelector('.js-apply-discount');
    const label = this.querySelector('.js-apply-discount-label');
    const feedback = this.querySelector('.js-discount-feedback');

    if (!wrap || !input || !btn || !feedback) return;
    if (input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';

    const messages = {
      apply: wrap.dataset.labelApply || 'Apply',
      applying: wrap.dataset.labelApplying || 'Applying',
      notFound: wrap.dataset.errorNotFound || 'Discount code not found',
      already: wrap.dataset.errorAlready || 'This code is already applied',
      generic: wrap.dataset.errorGeneric || 'This code couldn’t be applied'
    };

    const codeMatches = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

    const findCode = (cart, code) => {
      const list = cart.discount_codes || [];
      return list.find((entry) => codeMatches(entry.code, code));
    };

    const setBusy = (busy) => {
      wrap.classList.toggle('is-loading', busy);
      wrap.setAttribute('aria-busy', busy ? 'true' : 'false');
      btn.classList.toggle('is-loading', busy);
      input.disabled = busy;
      if (label) label.textContent = busy ? messages.applying : messages.apply;
      if (!busy) {
        btn.disabled = !input.value.trim();
      } else {
        btn.disabled = true;
      }
    };

    const showError = (key) => {
      feedback.textContent = messages[key] || messages.generic;
      feedback.className = 'cart-drawer__discount-feedback js-discount-feedback cart-drawer__discount-feedback--error';
    };

    const clearFeedback = () => {
      feedback.textContent = '';
      feedback.className = 'cart-drawer__discount-feedback js-discount-feedback';
    };

    const syncApplyEnabled = () => {
      if (wrap.classList.contains('is-loading')) return;
      btn.disabled = !input.value.trim();
    };

    const rememberOpen = (open) => {
      try {
        sessionStorage.setItem(CART_DRAWER_STORAGE_DISCOUNT, open ? 'true' : 'false');
      } catch (err) {
        /* ignore */
      }
      wrap.classList.toggle('is-open', open);
      const toggle = wrap.querySelector('.js-discount-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', String(open));
    };

    const applyDiscount = async () => {
      const code = input.value.trim();
      if (!code || wrap.classList.contains('is-loading')) return;

      clearFeedback();
      setBusy(true);

      try {
        const currentRes = await fetch('/cart.js', { credentials: 'same-origin' });
        const currentCart = await currentRes.json();
        const existing = findCode(currentCart, code);

        if (existing && existing.applicable !== false) {
          showError('already');
          return;
        }

        const updateRes = await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ discount: code })
        });

        let updatedCart = null;
        try {
          updatedCart = await updateRes.json();
        } catch (err) {
          updatedCart = null;
        }

        if (!updatedCart || updatedCart.status) {
          await fetch(`/discount/${encodeURIComponent(code)}`, {
            method: 'GET',
            redirect: 'follow',
            credentials: 'same-origin'
          });
          const fallbackRes = await fetch('/cart.js', { credentials: 'same-origin' });
          updatedCart = await fallbackRes.json();
        }

        const applied = findCode(updatedCart, code);
        if (applied && applied.applicable !== false) {
          input.value = '';
          clearFeedback();
          rememberOpen(true);
          const cartForm = this.querySelector('cart-form');
          if (cartForm && typeof cartForm.refresh === 'function') {
            await cartForm.refresh();
          }
          return;
        }

        if (applied && applied.applicable === false) {
          showError('generic');
          return;
        }

        showError('notFound');
      } catch (err) {
        showError('generic');
        console.error('[CartDrawer] Discount error:', err);
      } finally {
        setBusy(false);
      }
    };

    input.addEventListener('input', () => {
      if (feedback.classList.contains('cart-drawer__discount-feedback--error')) {
        clearFeedback();
      }
      syncApplyEnabled();
    });

    btn.addEventListener('click', applyDiscount);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyDiscount();
      }
    });

    syncApplyEnabled();
  }

  initDiscountAccordion() {
    const wrap = this.querySelector('.js-discount-wrapper');
    const toggle = wrap ? wrap.querySelector('.js-discount-toggle') : null;
    if (!wrap || !toggle) return;

    let remembered = null;
    try {
      remembered = sessionStorage.getItem(CART_DRAWER_STORAGE_DISCOUNT);
    } catch (err) {
      remembered = null;
    }

    if (remembered === 'true') {
      wrap.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      wrap.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    if (toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', () => {
      const open = wrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      try {
        sessionStorage.setItem(CART_DRAWER_STORAGE_DISCOUNT, open ? 'true' : 'false');
      } catch (err) {
        /* ignore */
      }
    });
  }

  initSizeEditor() {
    if (this.dataset.sizeEditorBound === 'true') return;
    this.dataset.sizeEditorBound = 'true';

    this.addEventListener('click', (evt) => {
      const btn = evt.target.closest('.js-edit-size');
      if (!btn || !this.contains(btn)) return;
      evt.preventDefault();
      this.openSizeModal(btn);
    });
  }

  openSizeModal(btn) {
    const modal = document.getElementById('CartDrawerSizeModal');
    if (!modal) return;

    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }

    const optionsEl = modal.querySelector('.js-size-modal-options');
    const productEl = modal.querySelector('.js-size-modal-product');
    const variantsScript = btn.parentElement.querySelector('.js-size-variants');
    if (!optionsEl || !variantsScript) return;

    let variants = [];
    try {
      variants = JSON.parse(variantsScript.textContent);
    } catch (err) {
      console.error('[CartDrawer] Invalid size variants JSON', err);
      return;
    }

    const sizeIndex = Number(btn.dataset.sizeOptionIndex || 0);
    const currentId = Number(btn.dataset.variantId);
    const optionKeys = ['option1', 'option2', 'option3'];
    const currentOptions = [
      btn.dataset.option1 || null,
      btn.dataset.option2 || null,
      btn.dataset.option3 || null
    ];

    const sizeMap = new Map();
    variants.forEach((variant) => {
      let matches = true;
      optionKeys.forEach((key, index) => {
        if (index === sizeIndex) return;
        const currentVal = currentOptions[index];
        if (currentVal && variant[key] !== currentVal) matches = false;
      });
      if (!matches) return;
      const label = variant[optionKeys[sizeIndex]];
      if (!label || sizeMap.has(label)) return;
      sizeMap.set(label, variant);
    });

    if (productEl) productEl.textContent = btn.dataset.productTitle || '';
    optionsEl.innerHTML = '';

    sizeMap.forEach((variant, label) => {
      const optionBtn = document.createElement('button');
      optionBtn.type = 'button';
      optionBtn.className = 'cart-drawer__size-option';
      optionBtn.textContent = label;
      if (Number(variant.id) === currentId) optionBtn.classList.add('is-current');
      if (!variant.available && Number(variant.id) !== currentId) optionBtn.disabled = true;
      optionBtn.addEventListener('click', () => {
        if (Number(variant.id) === currentId) {
          modal.close();
          return;
        }
        this.swapLineVariant({
          modal,
          optionsEl,
          oldKey: btn.dataset.lineKey,
          quantity: Number(btn.dataset.quantity || 1),
          newVariantId: variant.id
        });
      });
      optionsEl.appendChild(optionBtn);
    });

    modal.open(btn);
  }

  async swapLineVariant({ modal, optionsEl, oldKey, quantity, newVariantId }) {
    optionsEl.querySelectorAll('button').forEach((el) => el.classList.add('is-loading'));
    try {
      await fetch(`${(window.theme && theme.routes && theme.routes.cart) || '/cart'}/change.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: oldKey, quantity: 0 })
      });

      const addRes = await fetch((window.theme && theme.routes && theme.routes.cartAdd) || '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items: [{ id: Number(newVariantId), quantity: quantity || 1 }] })
      });

      if (!addRes.ok) {
        throw new Error('Unable to add selected size');
      }

      if (modal && typeof modal.close === 'function') modal.close();

      const cartForm = this.querySelector('cart-form');
      if (cartForm && typeof cartForm.refresh === 'function') {
        await cartForm.refresh();
      }
    } catch (err) {
      console.error('[CartDrawer] Size swap failed:', err);
      optionsEl.querySelectorAll('button').forEach((el) => el.classList.remove('is-loading'));
    }
  }
}

if (!customElements.get('cart-drawer')) {
  window.customElements.define('cart-drawer', CartDrawer);
}
