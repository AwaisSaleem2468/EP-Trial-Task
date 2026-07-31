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

  const initCustomBanners = () => {
    document.querySelectorAll('[data-custom-banner]').forEach((section) => {
      if (section.dataset.bannerInitialized === 'true') return;
      section.dataset.bannerInitialized = 'true';
      new CustomBanner(section);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomBanners, { once: true });
  } else {
    initCustomBanners();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('[data-custom-banner]');
    if (!section) return;
    section.dataset.bannerInitialized = 'false';
    new CustomBanner(section);
    section.dataset.bannerInitialized = 'true';
  });
})();
