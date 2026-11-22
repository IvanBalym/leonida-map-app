import L from 'leaflet';
import { BOUNDS, ISLAND_BOUNDS, MAX_ZOOM, MIN_ZOOM, SPACE, TILE_URL } from '../config.js';

/**
 * Flat CRS where the WHOLE map is always [[0,0],[1000,1000]] regardless of tile resolution.
 * At zoom 0 the map is one 256px tile, so 1000 units -> 256 px (scale 0.256).
 * Y is flipped so lat=1000 is the top edge (matches XYZ tiles with y counted from the top).
 */
const k = 256 / SPACE;
export const LeonidaCRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(k, 0, -k, 256),
});

export function createMap(el) {
  const bounds = L.latLngBounds(BOUNDS);

  const map = L.map(el, {
    crs: LeonidaCRS,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 100,
    maxBounds: bounds.pad(0.2),
    maxBoundsViscosity: 0.85,
    zoomControl: false,
    attributionControl: false,
    tap: false,
    bounceAtZoomLimits: false,
  });

  L.tileLayer(TILE_URL, {
    noWrap: true,
    bounds,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxNativeZoom: MAX_ZOOM,
    tileSize: 256,
    keepBuffer: 4,
    updateWhenZooming: false,
    crossOrigin: true,
    className: 'tiles',
  }).addTo(map);

  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map);

  map.fitBounds(ISLAND_BOUNDS, { animate: false });
  return map;
}

export const latLngToYX = (ll) => [Math.round(ll.lat * 10) / 10, Math.round(ll.lng * 10) / 10];
