import PhotoSwipe from 'photoswipe';
import PhotoSwipeLightbox from 'photoswipe/lightbox';

let lightbox: PhotoSwipeLightbox | null = null;
let refreshTimer = 0;
let gallerySignature = '';

function scriptRelativeUrl(path: string): string {
  const script = document.currentScript as HTMLScriptElement | null
    || document.querySelector('script[src*="listing-lightbox.js"]') as HTMLScriptElement | null;
  return script?.src ? new URL(path, script.src).toString() : path;
}

function injectPhotoSwipeCss(): void {
  if (document.querySelector('link[data-biscoon-photoswipe-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = scriptRelativeUrl('../../vendor/photoswipe/photoswipe.css');
  link.dataset.biscoonPhotoswipeCss = 'true';
  document.head.appendChild(link);
}

function setDimensionsFromImage(link: HTMLAnchorElement): void {
  const image = link.querySelector('img');
  if (!image) return;
  const apply = (): void => {
    if (image.naturalWidth && image.naturalHeight) {
      link.dataset.pswpWidth = String(image.naturalWidth);
      link.dataset.pswpHeight = String(image.naturalHeight);
      return;
    }
    link.dataset.pswpWidth ||= '1600';
    link.dataset.pswpHeight ||= '1200';
  };

  if (image.complete) apply();
  else image.addEventListener('load', apply, { once: true });
}

function prepareGalleries(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-pswp-gallery] a').forEach(link => {
    const href = link.getAttribute('href') || link.dataset.pswpSrc || '';
    if (!href) return;
    link.dataset.pswpSrc = href;
    setDimensionsFromImage(link);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  });
}

function refreshLightbox(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-pswp-gallery] a'));
    const hasGallery = links.length > 0;
    if (!hasGallery) return;
    injectPhotoSwipeCss();
    prepareGalleries();
    const nextSignature = links.map(link => link.getAttribute('href') || '').join('|');
    if (lightbox && nextSignature === gallerySignature) return;
    gallerySignature = nextSignature;
    lightbox?.destroy();
    lightbox = new PhotoSwipeLightbox({
      gallery: '[data-pswp-gallery]',
      children: 'a',
      pswpModule: PhotoSwipe,
    });
    lightbox.init();
  }, 80);
}

function start(): void {
  refreshLightbox();
  const observer = new MutationObserver(refreshLightbox);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
