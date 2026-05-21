import maplibregl from 'maplibre-gl';

type LngLat = [number, number];

const CITY_COORDS: Record<string, LngLat> = {
  boston: [-71.0589, 42.3601],
  cambridge: [-71.1097, 42.3736],
  lowell: [-71.3162, 42.6334],
  somerville: [-71.0995, 42.3876],
  allston: [-71.1329, 42.3555],
  queens: [-73.7949, 40.7282],
  'new york': [-74.006, 40.7128],
  brooklyn: [-73.9442, 40.6782],
  jersey: [-74.0776, 40.7282],
  dallas: [-96.797, 32.7767],
  houston: [-95.3698, 29.7604],
  chicago: [-87.6298, 41.8781],
  denver: [-104.9903, 39.7392],
  seattle: [-122.3321, 47.6062],
  'san francisco': [-122.4194, 37.7749],
  'los angeles': [-118.2437, 34.0522],
  atlanta: [-84.388, 33.749],
};

const LOCAL_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'biscoon-background',
      type: 'background',
      paint: { 'background-color': '#edf4f7' },
    },
  ],
} as any;

function scriptRelativeUrl(path: string): string {
  const script = document.currentScript as HTMLScriptElement | null
    || document.querySelector('script[src*="listing-map.js"]') as HTMLScriptElement | null;
  return script?.src ? new URL(path, script.src).toString() : path;
}

function injectCss(): void {
  if (document.querySelector('link[data-biscoon-maplibre-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = scriptRelativeUrl('../../vendor/maplibre/maplibre-gl.css');
  link.dataset.biscoonMaplibreCss = 'true';
  document.head.appendChild(link);
}

function guessCoords(location: string): LngLat {
  const value = location.toLowerCase();
  const match = Object.entries(CITY_COORDS).find(([name]) => value.includes(name));
  if (match) return match[1];
  return [-98.5795, 39.8283];
}

function initMap(shell: HTMLElement): void {
  if (shell.dataset.mapReady === 'true') return;
  const canvas = shell.querySelector<HTMLElement>('[data-map-canvas]');
  if (!canvas) return;
  injectCss();
  shell.dataset.mapReady = 'true';
  const location = shell.dataset.location || 'United States';
  const center = guessCoords(location);
  const map = new maplibregl.Map({
    container: canvas,
    style: LOCAL_STYLE,
    center,
    zoom: center[0] === -98.5795 ? 3 : 10,
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  new maplibregl.Marker({ color: '#C0392B' })
    .setLngLat(center)
    .setPopup(new maplibregl.Popup({ offset: 18 }).setText(location))
    .addTo(map);
}

function scan(): void {
  document.querySelectorAll<HTMLElement>('[data-listing-map]').forEach(initMap);
}

function start(): void {
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
