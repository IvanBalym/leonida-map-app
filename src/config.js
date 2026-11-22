const env = import.meta.env;

/** Base URL of the leonida-map-tiles deployment (no trailing slash). */
export const CDN = String(env.VITE_CDN_BASE_URL || '').replace(/\/+$/, '');
export const TILES_PATH = String(env.VITE_TILES_PATH || 'tiles').replace(/^\/+|\/+$/g, '');
export const TILE_URL = `${CDN}/${TILES_PATH}/{z}/{x}/{y}.webp`;

export const TG_BOT = env.VITE_TG_BOT || '';
export const TG_APP = env.VITE_TG_APP || '';
export const FREE_LIMIT = Number(env.VITE_FREE_LIMIT || 25);
export const PRO_URL = env.VITE_PRO_URL || '';

/** Normalized space: whole map = [[0,0],[1000,1000]], points are [Y, X], Y goes up. */
export const SPACE = 1000;
export const BOUNDS = [[0, 0], [SPACE, SPACE]];
/** Initial view: the island itself, not the whole square with ocean. */
export const ISLAND_BOUNDS = [[80, 230], [950, 830]];

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 5;

/** Label level-of-detail thresholds (fractional zoom). */
export const LOD = { cityFrom: 2, hideFrom: 3.5 };

/** Zoom used when focusing a single pin (deep link, search). */
export const PIN_FOCUS_ZOOM = 4;

export const params = new URLSearchParams(location.search);
export const IS_ADMIN = params.get('admin') === '1';
