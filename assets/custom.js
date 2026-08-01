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

      const isSubscribe = this.mode === 'subscribe';
      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');
      const cart = cartDrawer || cartNotification;
      const spinner = button.querySelector('.custom-featured__atc-spinner');
      const label = button.querySelector('[data-ep-atc-label]');
      const originalLabel = label?.textContent;
      const root = window.Shopify?.routes?.root || '/';
      const discountCode = (this.discountCode || this.section.dataset.subscribeDiscountCode || '').trim();

      button.classList.add('is-loading');
      button.setAttribute('aria-disabled', 'true');
      spinner?.classList.remove('hidden');

      try {
        if (isSubscribe && !discountCode) {
          throw new Error(
            'Add discount code SUBSCRIBE25 in the section setting “Subscribe discount code”'
          );
        }

        const sectionIds = cart?.getSectionsToRender
          ? cart.getSectionsToRender().map((section) => section.id)
          : ['cart-drawer', 'cart-icon-bubble'];

        // Add item (Dawn-compatible FormData request)
        const formData = new FormData();
        formData.append('id', variantId);
        formData.append('quantity', '1');
        formData.append(
          'properties[_purchase_option]',
          isSubscribe ? 'Subscribe & Save' : 'One-time'
        );
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

        // Apply subscribe discount via Cart Ajax API, then re-render sections
        let uiState = addData;
        if (isSubscribe && discountCode) {
          try {
            uiState = await this.applyDiscountCode(discountCode, sectionIds);
          } catch (discountError) {
            console.warn(discountError);
            // Item was added; still refresh UI even if discount failed
          }
        }

        this.renderCartContents(uiState, cartDrawer, cartNotification, button);

        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'custom-featured',
            productVariantId: String(variantId),
            cartData: addData,
          });
        }
      } catch (error) {
        console.error(error);
        if (label) {
          label.textContent = 'Error';
          setTimeout(() => {
            label.textContent = originalLabel;
          }, 1800);
        }
      } finally {
        button.classList.remove('is-loading');
        button.removeAttribute('aria-disabled');
        spinner?.classList.add('hidden');
      }
    }

    /**
     * Apply a Shopify Admin discount code via Cart Ajax API (/cart/update.js).
     * Returns cart JSON (optionally with rendered sections).
     */
    async applyDiscountCode(code, sectionIds = []) {
      const root = window.Shopify?.routes?.root || '/';
      const body = { discount: code };

      if (sectionIds.length) {
        body.sections = sectionIds.join(',');
        body.sections_url = window.location.pathname;
      }

      const response = await fetch(window.routes?.cart_update_url || `${root}cart/update.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || data.status) {
        throw new Error(data.description || data.message || `Unable to apply discount ${code}`);
      }

      return data;
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
        // Ensure bubble updates even if drawer paint path skips it
        this.updateCartIconBubble(parsedState.sections['cart-icon-bubble']);
        return;
      }

      // Fallback if theme cart component is unavailable
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

  const initAll = () => {
    initCustomBanners();
    initCustomFeatured();
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
  });
})();
