(() => {
  'use strict';

  class CustomBanner {
    /**
     * @param {HTMLElement} section
     */
    constructor(section) {
      this.section = section;
      this.media = section.querySelector('.custom-banner__media');
      this.bindMediaLoad();
    }

    bindMediaLoad() {
      if (!this.media || this.media.classList.contains('custom-banner__media--placeholder')) {
        return;
      }

      const markLoaded = () => {
        this.media.classList.add('is-loaded');
      };

      if (this.media.complete && this.media.naturalWidth > 0) {
        markLoaded();
        return;
      }

      this.media.addEventListener('load', markLoaded, { once: true });
      this.media.addEventListener('error', markLoaded, { once: true });
    }
  }

  class CustomFeaturedCollection {
    /**
     * @param {HTMLElement} section
     */
    constructor(section) {
      this.section = section;
      this.track = section.querySelector('[data-ep-track]');
      this.tabs = [...section.querySelectorAll('[data-ep-tab]')];
      this.slides = [...section.querySelectorAll('[data-ep-slide]')];
      this.prevBtn = section.querySelector('[data-ep-prev]');
      this.nextBtn = section.querySelector('[data-ep-next]');
      this.mode = section.dataset.purchaseMode || 'subscribe';
      this.discountCode = (section.dataset.subscribeDiscountCode || '').trim();
      this.onetimeDiscountCode = (section.dataset.onetimeDiscountCode || '').trim();
      this.subscribeSellingPlanId = (section.dataset.subscribeSellingPlan || '').trim();
      this.activeTabId =
        this.tabs.find((tab) => tab.classList.contains('is-active'))?.dataset.tabId ||
        this.tabs[0]?.dataset.tabId;

      this.onTabClick = this.onTabClick.bind(this);
      this.onModeClick = this.onModeClick.bind(this);
      this.onPrev = this.onPrev.bind(this);
      this.onNext = this.onNext.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onAtcClick = this.onAtcClick.bind(this);

      this.bind();
      this.applyMode(this.mode, false);
      this.filterSlides(this.activeTabId, false);
      this.updateArrowState();
    }

    bind() {
      this.tabs.forEach((tab) => tab.addEventListener('click', this.onTabClick));

      this.section.querySelectorAll('[data-ep-mode]').forEach((btn) => {
        btn.addEventListener('click', this.onModeClick);
      });

      this.prevBtn?.addEventListener('click', this.onPrev);
      this.nextBtn?.addEventListener('click', this.onNext);
      this.track?.addEventListener('scroll', this.onScroll, { passive: true });

      this.section.addEventListener('click', this.onAtcClick);
    }

    onTabClick(event) {
      const tab = event.currentTarget;
      const tabId = tab.dataset.tabId;
      if (!tabId || tabId === this.activeTabId) return;

      this.activeTabId = tabId;

      this.tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', String(isActive));
      });

      if (tab.dataset.tabBg) {
        this.section.style.setProperty('--ep-featured-bg', tab.dataset.tabBg);
      }

      this.filterSlides(tabId, true);
    }

    filterSlides(tabId, resetScroll) {
      this.slides.forEach((slide) => {
        const match = slide.dataset.tab === tabId;
        slide.classList.toggle('hidden', !match);
        if (match) {
          slide.removeAttribute('hidden');
        } else {
          slide.setAttribute('hidden', '');
        }
      });

      if (resetScroll && this.track) {
        this.track.scrollTo({ left: 0, behavior: 'smooth' });
      }

      requestAnimationFrame(() => this.updateArrowState());
    }

    onModeClick(event) {
      const mode = event.currentTarget.dataset.epMode;
      if (!mode || mode === this.mode) return;
      this.applyMode(mode, true);
    }

    applyMode(mode, announce) {
      this.mode = mode;
      this.section.dataset.purchaseMode = mode;

      this.section.querySelectorAll('[data-ep-mode]').forEach((btn) => {
        const isActive = btn.dataset.epMode === mode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      this.section.querySelectorAll('[data-ep-price]').forEach((priceEl) => {
        const current = priceEl.querySelector('[data-ep-price-current]');
        const compare = priceEl.querySelector('[data-ep-price-compare]');
        if (!current) return;

        if (mode === 'subscribe') {
          current.textContent = priceEl.dataset.subscribe || priceEl.dataset.onetime || '';
          const compareText = priceEl.dataset.compare || priceEl.dataset.compareOnetime || '';
          if (compare) {
            if (compareText && compareText !== current.textContent) {
              compare.textContent = compareText;
              compare.classList.remove('hidden');
            } else {
              compare.classList.add('hidden');
            }
          }
        } else {
          current.textContent = priceEl.dataset.onetime || '';
          const compareText = priceEl.dataset.compare || '';
          if (compare) {
            if (compareText && compareText !== current.textContent) {
              compare.textContent = compareText;
              compare.classList.remove('hidden');
            } else {
              compare.classList.add('hidden');
            }
          }
        }
      });

      if (announce) {
        this.section.dispatchEvent(
          new CustomEvent('ep:purchase-mode-change', {
            bubbles: true,
            detail: { mode },
          })
        );
      }
    }

    getStep() {
      const visibleSlide = this.track?.querySelector('[data-ep-slide]:not(.hidden)');
      if (!visibleSlide || !this.track) return 0;
      const styles = window.getComputedStyle(this.track);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      return visibleSlide.getBoundingClientRect().width + gap;
    }

    onPrev() {
      if (!this.track) return;
      this.track.scrollBy({ left: -this.getStep(), behavior: 'smooth' });
    }

    onNext() {
      if (!this.track) return;
      this.track.scrollBy({ left: this.getStep(), behavior: 'smooth' });
    }

    onScroll() {
      this.updateArrowState();
    }

    updateArrowState() {
      if (!this.track || !this.prevBtn || !this.nextBtn) return;
      const maxScroll = Math.max(0, this.track.scrollWidth - this.track.clientWidth - 2);
      this.prevBtn.disabled = this.track.scrollLeft <= 2;
      this.nextBtn.disabled = this.track.scrollLeft >= maxScroll;
    }

    async onAtcClick(event) {
      const button = event.target.closest('[data-ep-atc]');
      if (!button || !this.section.contains(button) || button.disabled) return;

      const card = button.closest('[data-ep-card]');
      if (!card) return;

      const variantId = card.dataset.variantId;
      if (!variantId) return;

      const activeMode = this.section.querySelector('[data-ep-mode].is-active')?.dataset.epMode;
      const isSubscribe = (activeMode || this.mode) === 'subscribe';
      this.mode = isSubscribe ? 'subscribe' : 'onetime';
      this.section.dataset.purchaseMode = this.mode;

      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');
      const cart = cartDrawer || cartNotification;
      const spinner = button.querySelector('.custom-featured__atc-spinner');
      const label = button.querySelector('[data-ep-atc-label]');
      const originalLabel = label?.textContent;
      const root = window.Shopify?.routes?.root || '/';
      const discountCode = (this.discountCode || this.section.dataset.subscribeDiscountCode || '').trim();
      const sellingPlanId = isSubscribe
        ? (
            card.dataset.sellingPlanId ||
            this.subscribeSellingPlanId ||
            this.section.dataset.subscribeSellingPlan ||
            ''
          ).trim()
        : '';

      button.classList.add('is-loading');
      button.setAttribute('aria-disabled', 'true');
      spinner?.classList.remove('hidden');

      try {
        if (isSubscribe && !discountCode) {
          throw new Error(
            'Add discount code SUBSCRIBE25 in the switch block setting “Subscribe discount code”'
          );
        }

        const sectionIds = cart?.getSectionsToRender
          ? cart.getSectionsToRender().map((section) => section.id)
          : ['cart-drawer', 'cart-icon-bubble'];

        const formData = new FormData();
        formData.append('id', variantId);
        formData.append('quantity', '1');
        formData.append(
          'properties[_purchase_option]',
          isSubscribe ? 'Autoship & Save' : 'One-time purchase'
        );
        if (sellingPlanId) {
          formData.append('selling_plan', sellingPlanId);
        }
        formData.append('sections', sectionIds.join(','));
        formData.append('sections_url', window.location.pathname);
        cart?.setActiveElement?.(document.activeElement);

        const config =
          typeof fetchConfig === 'function'
            ? fetchConfig('javascript')
            : { method: 'POST', headers: { Accept: 'application/javascript' } };

        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];
        config.body = formData;

        const addResponse = await fetch(window.routes?.cart_add_url || `${root}cart/add.js`, config);
        const addData = await addResponse.json();

        if (addData.status) {
          throw new Error(addData.description || addData.message || 'Unable to add to cart');
        }

        if (isSubscribe && !sellingPlanId) {
          console.warn(
            'Tabbed collection Subscribe ATC: missing selling plan ID. Set it on the One-time/Subscribe switch block (same ID as Featured Product).'
          );
        }

        const discountResult = await this.syncPurchaseDiscount({
          isSubscribe,
          subscribeCode: discountCode,
          sectionIds,
          fallbackState: addData,
        });

        this.renderCartContents(discountResult.uiState, cartDrawer, cartNotification, button);

        if (discountResult.uiState?.total_discount > 0) {
          this.paintDiscountFromCart(discountResult.uiState);
        }

        if (discountResult.warning) {
          this.showCartMessage(discountResult.warning);
        }

        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'custom-featured',
            productVariantId: String(variantId),
            cartData: addData,
          });
        }
      } catch (error) {
        console.error(error);
        this.showCartMessage(error.message || 'Unable to update cart');
        if (label) {
          label.textContent = 'Error';
          setTimeout(() => {
            label.textContent = originalLabel;
          }, 2200);
        }
      } finally {
        button.classList.remove('is-loading');
        button.removeAttribute('aria-disabled');
        spinner?.classList.add('hidden');
      }
    }

    /**
     * Mixed cart support (no clearing):
     * - Subscribe add → attach selling plan + apply SUBSCRIBE25
     * - One-time add → no selling plan, do NOT clear discounts
     * SUBSCRIBE25 must be Admin purchase type "Subscription" so only plan lines get 25% off.
     */
    async syncPurchaseDiscount({ isSubscribe, subscribeCode, sectionIds, fallbackState }) {
      let uiState = fallbackState;
      let warning = '';
      const code = String(subscribeCode || '').trim();
      const root = window.Shopify?.routes?.root || '/';

      if (isSubscribe) {
        if (!code) {
          warning = 'Add subscribe discount code (e.g. SUBSCRIBE25) in section settings.';
          return { uiState, warning };
        }
        try {
          uiState = await this.applyDiscountCode(code, sectionIds);
          this.syncCheckoutDiscount(code);
        } catch (discountError) {
          console.error(discountError);
          warning = discountError.message || 'Subscribe discount could not be applied';
          this.syncCheckoutDiscount(code);
        }
        return { uiState, warning };
      }

      // One-time: never clear the cart discount.
      // If subscribe lines already exist, re-apply SUBSCRIBE25 so it stays on those lines only.
      try {
        const cartResponse = await fetch(`${root}cart.js`, { credentials: 'same-origin' });
        const cart = await cartResponse.json();
        const hasSubscribeLine = (cart.items || []).some(
          (item) =>
            item.selling_plan_allocation ||
            item.selling_plan_allocation != null ||
            /subscribe|autoship/i.test(String(item.properties?._purchase_option || ''))
        );
        const hasSubscribeCode = (cart.discount_codes || []).some(
          (entry) => String(entry.code || '').toUpperCase() === code.toUpperCase()
        );

        if (code && (hasSubscribeLine || hasSubscribeCode)) {
          uiState = await this.applyDiscountCode(code, sectionIds);
          this.syncCheckoutDiscount(code);
        }
      } catch (error) {
        console.warn(error);
      }

      return { uiState, warning };
    }

    /**
     * Apply a Shopify Admin discount code via Cart Ajax API (/cart/update.js).
     */
    async applyDiscountCode(code, sectionIds = []) {
      const root = window.Shopify?.routes?.root || '/';
      const normalized = String(code).trim();
      const body = { discount: normalized };

      if (sectionIds.length) {
        body.sections = sectionIds;
        body.sections_url = window.location.pathname;
      }

      const response = await fetch(window.routes?.cart_update_url || `${root}cart/update.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Unable to apply discount ${normalized} (invalid response)`);
      }

      if (!response.ok || data.status) {
        throw new Error(data.description || data.message || `Unable to apply discount ${normalized}`);
      }

      const match = (data.discount_codes || []).find(
        (entry) => String(entry.code || '').toUpperCase() === normalized.toUpperCase()
      );

      if (!match || match.applicable !== true || Number(data.total_discount || 0) <= 0) {
        throw new Error(
          `"${normalized}" did not discount any lines. For mixed carts: set this code’s Purchase type to “Subscription”, install Shopify’s free Subscriptions app, assign a plan to the product, and set the Subscribe selling plan ID in the section.`
        );
      }

      return data;
    }

    /**
     * Remove discount codes from the cart (needed so one-time ATC is not under SUBSCRIBE25).
     */
    async clearDiscountCodes(sectionIds = []) {
      const root = window.Shopify?.routes?.root || '/';
      const body = { discount: '' };

      if (sectionIds.length) {
        body.sections = sectionIds;
        body.sections_url = window.location.pathname;
      }

      const response = await fetch(window.routes?.cart_update_url || `${root}cart/update.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Unable to clear cart discount (invalid response)');
      }

      if (!response.ok || data.status) {
        throw new Error(data.description || data.message || 'Unable to clear cart discount');
      }

      return data;
    }

    /**
     * Keep discount on the cart drawer checkout submit (backup for checkout).
     */
    syncCheckoutDiscount(code) {
      const form = document.getElementById('CartDrawer-Form');
      if (!form) return;

      let input = form.querySelector('[data-ep-checkout-discount]');
      if (!code) {
        input?.remove();
        return;
      }

      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'discount';
        input.setAttribute('data-ep-checkout-discount', 'true');
        form.appendChild(input);
      }
      input.value = code;
    }

    showCartMessage(message) {
      const el = document.getElementById('CartDrawer-CartErrors');
      if (!el) return;
      el.textContent = message;
    }

    formatMoney(cents, currency = 'USD') {
      const amount = Number(cents || 0) / 100;
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency,
        }).format(amount);
      } catch (error) {
        return `$${amount.toFixed(2)}`;
      }
    }

    /**
     * Paint discounted totals/lines from cart.js JSON (Liquid may not expose code discounts).
     */
    paintDiscountFromCart(cart) {
      if (!cart || Number(cart.total_discount || 0) <= 0) return;

      const drawer = document.querySelector('cart-drawer');
      if (!drawer) return;

      const currency = cart.currency || 'USD';
      const totalEl = drawer.querySelector('.totals__total-value');
      if (totalEl) {
        totalEl.textContent = this.formatMoney(cart.total_price, currency);
      }

      const footerHost = drawer.querySelector('.cart-drawer__footer > div');
      if (footerHost) {
        let list = footerHost.querySelector('[data-ep-discount-list]');
        if (!list) {
          list = document.createElement('ul');
          list.className = 'discounts list-unstyled';
          list.setAttribute('data-ep-discount-list', 'true');
          list.setAttribute('role', 'list');
          footerHost.prepend(list);
        }

        const apps =
          cart.cart_level_discount_applications?.length > 0
            ? cart.cart_level_discount_applications
            : (cart.discount_codes || [])
                .filter((entry) => entry.applicable)
                .map((entry) => ({
                  title: entry.code,
                  total_allocated_amount: cart.total_discount,
                }));

        list.innerHTML = apps
          .map(
            (app) =>
              `<li class="discounts__discount discounts__discount--end">${app.title} (-${this.formatMoney(
                app.total_allocated_amount || cart.total_discount,
                currency
              )})</li>`
          )
          .join('');
      }

      (cart.items || []).forEach((item) => {
        if (!item.line_level_total_discount && item.original_price === item.final_price) return;
        const row =
          drawer.querySelector(`[data-variant-id="${item.variant_id}"]`) ||
          drawer.querySelector(`#CartDrawer-Item-${item.index || ''}`.replace(/-$/, ''));
        // Update visible unit price when line discounts exist
        if (item.final_price !== item.original_price) {
          const priceHost = row?.querySelector('.product-option, .cart-item__discounted-prices');
          if (priceHost && !priceHost.classList.contains('cart-item__discounted-prices')) {
            priceHost.innerHTML = `<s class="cart-item__old-price product-option">${this.formatMoney(
              item.original_price,
              currency
            )}</s> <strong class="cart-item__final-price product-option">${this.formatMoney(
              item.final_price,
              currency
            )}</strong>`;
          }
        }
      });
    }

    /**
     * Paint cart drawer + icon bubble from Cart API section HTML (Dawn pattern).
     */
    renderCartContents(parsedState, cartDrawer, cartNotification, trigger) {
      const cart = cartDrawer || cartNotification;

      if (cartDrawer?.classList.contains('is-empty')) {
        cartDrawer.classList.remove('is-empty');
      }

      if (cart?.renderContents && parsedState?.sections) {
        cart.renderContents(parsedState);
        this.updateCartIconBubble(parsedState.sections['cart-icon-bubble']);
        return;
      }

      this.updateCartIconBubble(parsedState?.sections?.['cart-icon-bubble']);
      cartDrawer?.open?.(trigger);
    }

    /**
     * Dawn puts cart-icon-bubble section inner HTML into #cart-icon-bubble (the header <a>).
     */
    updateCartIconBubble(sectionHtml) {
      if (!sectionHtml) return;

      const target = document.getElementById('cart-icon-bubble');
      if (!target) return;

      const parsed = new DOMParser().parseFromString(sectionHtml, 'text/html');
      const source = parsed.querySelector('.shopify-section') || parsed.body;
      if (source) {
        target.innerHTML = source.innerHTML;
      }
    }
  }

  class CustomFeaturedProduct {
    /**
     * @param {HTMLElement} section
     */
    constructor(section) {
      this.section = section;
      this.mode = section.dataset.purchaseMode || 'subscribe';
      this.discountPercent = Number(section.dataset.discountPercent || 0);
      this.discountCode = (section.dataset.subscribeDiscountCode || '').trim();
      this.onetimeDiscountCode = (section.dataset.onetimeDiscountCode || '').trim();
      this.subscribeSellingPlanId = (section.dataset.subscribeSellingPlan || '').trim();
      this.onetimeSellingPlanId = (section.dataset.onetimeSellingPlan || '').trim();
      this.buttonLabel = section.dataset.buttonLabel || 'Add to cart';
      this.subscribeLabel = section.dataset.subscribeLabel || 'Subscribe';
      this.onetimeLabel = section.dataset.onetimeLabel || 'One-time';
      this.servingsLabel = section.dataset.servingsLabel || 'servings';
      this.dayLabel = section.dataset.dayLabel || 'day';
      this.variants = this.parseJson('[data-fp-variants]', []);
      this.media = this.parseJson('[data-fp-media]', []);
      this.atc = section.querySelector('[data-fp-atc]');
      this.mainImage =
        section.querySelector('[data-fp-main-image]') || section.querySelector('.custom-fp__main-image');
      this.selected = this.getInitialSelection();
      this.manualGallery = false;

      this.onOptionClick = this.onOptionClick.bind(this);
      this.onModeClick = this.onModeClick.bind(this);
      this.onThumbClick = this.onThumbClick.bind(this);
      this.onAtcClick = this.onAtcClick.bind(this);

      this.bind();
      this.syncUI();
    }

    parseJson(selector, fallback) {
      const node = this.section.querySelector(selector);
      if (!node) return fallback;
      try {
        return JSON.parse(node.textContent);
      } catch (error) {
        console.warn('Featured product JSON parse failed', error);
        return fallback;
      }
    }

    getInitialSelection() {
      const activeButtons = [...this.section.querySelectorAll('[data-fp-option].is-active')];
      const selected = {};
      activeButtons.forEach((btn) => {
        selected[btn.dataset.optionIndex] = btn.dataset.optionValue;
      });

      const variant =
        this.findVariant(selected) ||
        this.variants.find((item) => item.available) ||
        this.variants[0];

      if (variant?.options) {
        variant.options.forEach((value, index) => {
          selected[index] = value;
        });
      }

      return { options: selected, variant };
    }

    bind() {
      this.section.querySelectorAll('[data-fp-option]').forEach((btn) => {
        btn.addEventListener('click', this.onOptionClick);
      });
      this.section.querySelectorAll('[data-fp-mode]').forEach((btn) => {
        btn.addEventListener('click', this.onModeClick);
      });
      this.section.querySelectorAll('[data-fp-thumb]').forEach((btn) => {
        btn.addEventListener('click', this.onThumbClick);
      });
      this.atc?.addEventListener('click', this.onAtcClick);
    }

    onOptionClick(event) {
      const button = event.currentTarget;
      if (button.classList.contains('is-unavailable')) return;

      const index = button.dataset.optionIndex;
      const value = button.dataset.optionValue;
      this.selected.options[index] = value;

      const variant = this.findVariant(this.selected.options);
      if (!variant) return;

      this.selected.variant = variant;
      variant.options.forEach((opt, i) => {
        this.selected.options[i] = opt;
      });
      this.manualGallery = false;
      this.syncUI();
    }

    onModeClick(event) {
      const mode = event.currentTarget.dataset.fpMode;
      if (!mode || mode === this.mode) return;
      this.mode = mode;
      this.section.dataset.purchaseMode = mode;
      this.syncUI();
    }

    onThumbClick(event) {
      const button = event.currentTarget.closest('[data-fp-thumb]');
      if (!button) return;

      const src = button.dataset.mediaSrc;
      if (!src) return;

      this.manualGallery = true;
      this.setMainImage({
        src,
        srcset: button.dataset.mediaSrcset || '',
        alt: button.dataset.mediaAlt || '',
      });

      this.section.querySelectorAll('[data-fp-thumb]').forEach((thumb) => {
        const active = thumb === button;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-pressed', String(active));
      });
    }

    setMainImage({ src, srcset = '', alt = '' }) {
      if (!this.mainImage || !src) return;

      this.mainImage.src = src;
      if (srcset) {
        this.mainImage.setAttribute('srcset', srcset);
      } else {
        this.mainImage.removeAttribute('srcset');
      }
      if (alt) this.mainImage.alt = alt;
    }

    setActiveThumbBySrc(src) {
      if (!src) return;
      const path = String(src).split('?')[0];
      this.section.querySelectorAll('[data-fp-thumb]').forEach((thumb) => {
        const thumbPath = String(thumb.dataset.mediaSrc || '').split('?')[0];
        const active = thumbPath === path || String(thumb.dataset.mediaSrc) === String(src);
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-pressed', String(active));
      });
    }

    findVariant(selectedOptions) {
      return this.variants.find((variant) =>
        variant.options.every((value, index) => {
          if (selectedOptions[index] == null || selectedOptions[index] === '') return true;
          return variant.options[index] === selectedOptions[index];
        })
      );
    }

    getPriceForMode(variant, mode = this.mode) {
      const base = Number(variant?.price || 0);
      if (mode === 'subscribe' && this.discountPercent > 0) {
        return Math.round(base - (base * this.discountPercent) / 100);
      }
      return base;
    }

    formatMoney(cents) {
      const amount = Number(cents || 0) / 100;
      const currency = window.Shopify?.currency?.active || 'USD';
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency,
          maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
        }).format(amount);
      } catch (error) {
        return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
      }
    }

    syncUI() {
      const variant = this.selected.variant;
      if (!variant) return;

      this.section.querySelectorAll('[data-fp-option]').forEach((btn) => {
        const index = btn.dataset.optionIndex;
        const value = btn.dataset.optionValue;
        const isActive = this.selected.options[index] === value;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));

        const probe = { ...this.selected.options, [index]: value };
        const match = this.findVariant(probe);
        const unavailable = !match || !match.available;
        btn.classList.toggle('is-unavailable', unavailable);
        btn.disabled = unavailable && !isActive;
      });

      this.section.querySelectorAll('[data-fp-mode]').forEach((btn) => {
        const active = btn.dataset.fpMode === this.mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      this.updateSizeCards();
      this.updatePurchaseCards(variant);
      this.updateAtc(variant);

      if (variant.featured_image && this.mainImage && !this.manualGallery) {
        this.setMainImage({
          src: variant.featured_image,
          srcset: '',
          alt: this.mainImage.alt || '',
        });
        this.setActiveThumbBySrc(variant.featured_image);
      }
    }

    updateSizeCards() {
      this.section.querySelectorAll('[data-fp-size]').forEach((card) => {
        const value = card.dataset.optionValue;
        const index = card.dataset.optionIndex;
        const probe = { ...this.selected.options, [index]: value };
        const variant = this.findVariant(probe);
        const dayEl = card.querySelector('[data-fp-size-day]');
        if (!variant || !dayEl) return;

        const servings = Number(variant.servings || card.dataset.servings || 0);
        const price = this.getPriceForMode(variant);
        if (servings > 0) {
          const perDay = Math.round(price / servings);
          dayEl.textContent = `${this.formatMoney(perDay)} / ${this.dayLabel}`;
          dayEl.hidden = false;
        } else {
          dayEl.hidden = true;
        }
      });
    }

    updatePurchaseCards(variant) {
      const onetime = Number(variant.price || 0);
      const compare = Number(variant.compare_at_price || onetime);
      const subscribe = this.getPriceForMode(variant, 'subscribe');
      const servings = Number(variant.servings || 0);
      const saveAmount = Math.max(compare, onetime) - subscribe;

      const subPrice = this.section.querySelector('[data-fp-subscribe-price]');
      const compareEl = this.section.querySelector('[data-fp-compare-price]');
      const saveRow = this.section.querySelector('[data-fp-save-row]');
      const onePrice = this.section.querySelector('[data-fp-onetime-price]');
      const oneDay = this.section.querySelector('[data-fp-onetime-day]');

      if (subPrice) subPrice.textContent = this.formatMoney(subscribe);
      if (compareEl) {
        compareEl.textContent = this.formatMoney(compare > onetime ? compare : onetime);
        compareEl.hidden = !(compare > subscribe || onetime > subscribe);
      }
      if (saveRow) {
        const dayText =
          servings > 0 ? ` · ${this.formatMoney(Math.round(subscribe / servings))}/${this.dayLabel}` : '';
        saveRow.textContent =
          saveAmount > 0 ? `You save ${this.formatMoney(saveAmount)}${dayText}` : dayText.replace(/^ · /, '');
      }
      if (onePrice) onePrice.textContent = this.formatMoney(onetime);
      if (oneDay) {
        oneDay.textContent =
          servings > 0 ? `${this.formatMoney(Math.round(onetime / servings))}/${this.dayLabel}` : '';
      }
    }

    updateAtc(variant) {
      if (!this.atc) return;
      const price = this.getPriceForMode(variant);
      const label = this.atc.querySelector('[data-fp-atc-label]');
      if (label) {
        label.textContent =
          this.mode === 'subscribe'
            ? `${this.buttonLabel} · Subscribe · ${this.formatMoney(price)}`
            : `${this.buttonLabel} · ${this.formatMoney(price)}`;
      }
      this.atc.dataset.variantId = String(variant.id);
      this.atc.disabled = !variant.available;
    }

    async onAtcClick() {
      const variantId = this.atc?.dataset.variantId;
      if (!variantId || this.atc.disabled) return;

      const activeMode = this.section.querySelector('[data-fp-mode].is-active')?.dataset.fpMode;
      const isSubscribe = (activeMode || this.mode) === 'subscribe';
      this.mode = isSubscribe ? 'subscribe' : 'onetime';
      this.section.dataset.purchaseMode = this.mode;

      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');
      const cart = cartDrawer || cartNotification;
      const label = this.atc.querySelector('[data-fp-atc-label]');
      const spinner = this.atc.querySelector('.custom-fp__atc-spinner');
      const originalLabel = label?.textContent;
      const root = window.Shopify?.routes?.root || '/';

      this.atc.classList.add('is-loading');
      this.atc.setAttribute('aria-disabled', 'true');
      spinner?.classList.remove('hidden');

      try {
        if (isSubscribe && !this.discountCode) {
          throw new Error('Add subscribe discount code in section settings');
        }

        const sectionIds = cart?.getSectionsToRender
          ? cart.getSectionsToRender().map((section) => section.id)
          : ['cart-drawer', 'cart-icon-bubble'];

        const formData = new FormData();
        formData.append('id', variantId);
        formData.append('quantity', '1');
        formData.append(
          'properties[_purchase_option]',
          isSubscribe ? 'Autoship & Save' : 'One-time purchase'
        );
        if (isSubscribe && this.subscribeSellingPlanId) {
          formData.append('selling_plan', this.subscribeSellingPlanId);
        }
        formData.append('sections', sectionIds.join(','));
        formData.append('sections_url', window.location.pathname);
        cart?.setActiveElement?.(document.activeElement);

        const config =
          typeof fetchConfig === 'function'
            ? fetchConfig('javascript')
            : { method: 'POST', headers: { Accept: 'application/javascript' } };
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];
        config.body = formData;

        const addResponse = await fetch(window.routes?.cart_add_url || `${root}cart/add.js`, config);
        const addData = await addResponse.json();
        if (addData.status) {
          throw new Error(addData.description || addData.message || 'Unable to add to cart');
        }

        if (isSubscribe && !this.subscribeSellingPlanId) {
          console.warn(
            'Mixed cart needs a subscribe selling plan. Install Shopify Subscriptions (free), assign a plan to the product, then set “Subscribe selling plan ID” in the section.'
          );
        }

        const discountResult = await this.syncPurchaseDiscount({
          isSubscribe,
          subscribeCode: this.discountCode,
          sectionIds,
          fallbackState: addData,
        });
        const uiState = discountResult.uiState;

        this.renderCartContents(uiState, cartDrawer, cartNotification, this.atc);
        if (uiState?.total_discount > 0) this.paintDiscountFromCart(uiState);
        if (discountResult.warning) this.showCartMessage(discountResult.warning);

        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'custom-featured-product',
            productVariantId: String(variantId),
            cartData: addData,
          });
        }
      } catch (error) {
        console.error(error);
        this.showCartMessage(error.message || 'Unable to update cart');
        if (label) {
          label.textContent = 'Error';
          setTimeout(() => {
            label.textContent = originalLabel;
          }, 2200);
        }
      } finally {
        this.atc.classList.remove('is-loading');
        this.atc.removeAttribute('aria-disabled');
        spinner?.classList.add('hidden');
      }
    }

    applyDiscountCode(code, sectionIds) {
      return CustomFeaturedCollection.prototype.applyDiscountCode.call(this, code, sectionIds);
    }

    clearDiscountCodes(sectionIds) {
      return CustomFeaturedCollection.prototype.clearDiscountCodes.call(this, sectionIds);
    }

    syncPurchaseDiscount(options) {
      return CustomFeaturedCollection.prototype.syncPurchaseDiscount.call(this, options);
    }

    syncCheckoutDiscount(code) {
      return CustomFeaturedCollection.prototype.syncCheckoutDiscount.call(this, code);
    }

    showCartMessage(message) {
      return CustomFeaturedCollection.prototype.showCartMessage.call(this, message);
    }

    formatMoneyCart(cents, currency) {
      return CustomFeaturedCollection.prototype.formatMoney.call(this, cents, currency);
    }

    paintDiscountFromCart(cart) {
      return CustomFeaturedCollection.prototype.paintDiscountFromCart.call(this, cart);
    }

    renderCartContents(parsedState, cartDrawer, cartNotification, trigger) {
      return CustomFeaturedCollection.prototype.renderCartContents.call(
        this,
        parsedState,
        cartDrawer,
        cartNotification,
        trigger
      );
    }

    updateCartIconBubble(sectionHtml) {
      return CustomFeaturedCollection.prototype.updateCartIconBubble.call(this, sectionHtml);
    }
  }

  const initCustomBanners = () => {
    document.querySelectorAll('[data-custom-banner]').forEach((section) => {
      if (section.dataset.bannerInitialized === 'true') return;
      section.dataset.bannerInitialized = 'true';
      new CustomBanner(section);
    });
  };

  const initCustomFeatured = () => {
    document.querySelectorAll('[data-custom-featured]').forEach((section) => {
      if (section.dataset.featuredInitialized === 'true') return;
      section.dataset.featuredInitialized = 'true';
      new CustomFeaturedCollection(section);
    });
  };

  const initCustomFeaturedProduct = () => {
    document.querySelectorAll('[data-custom-featured-product]').forEach((section) => {
      if (section.dataset.fpInitialized === 'true') return;
      section.dataset.fpInitialized = 'true';
      new CustomFeaturedProduct(section);
    });
  };

  const initAll = () => {
    initCustomBanners();
    initCustomFeatured();
    initCustomFeaturedProduct();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const banner = event.target.querySelector('[data-custom-banner]');
    if (banner) {
      banner.dataset.bannerInitialized = 'false';
      new CustomBanner(banner);
      banner.dataset.bannerInitialized = 'true';
    }

    const featured = event.target.querySelector('[data-custom-featured]');
    if (featured) {
      featured.dataset.featuredInitialized = 'false';
      new CustomFeaturedCollection(featured);
      featured.dataset.featuredInitialized = 'true';
    }

    const featuredProduct = event.target.querySelector('[data-custom-featured-product]');
    if (featuredProduct) {
      featuredProduct.dataset.fpInitialized = 'false';
      new CustomFeaturedProduct(featuredProduct);
      featuredProduct.dataset.fpInitialized = 'true';
    }
  });
})();
