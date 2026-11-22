# leonida-map-app

Interactive GTA 6 map (State of Leonida). It runs as a PWA and as a Telegram Mini App.
Built with Vite and vanilla ES modules, plus Leaflet. There's no UI framework.
Tiles and JSON data load from the separate **leonida-map-tiles** CDN repo via `VITE_CDN_BASE_URL`.

## Features

- **Map engine:** Leaflet with a custom `CRS.Simple`. The whole map is always `[[0,0],[1000,1000]]` (points are `[Y, X]`), whatever the tile resolution. Uses `noWrap`, bounds, and z0–5.
- **Regions** (`regions.json`): a neon outline and fill on hover/tap, a bottom HUD showing "Найдено X / Y", and a click flies to the region (`flyToBounds`).
- **Floating labels** (`labels.json`): `divIcon` with `pointer-events: none`, a multi-layer `text-shadow` and a slow levitate animation. LOD:
  - `zoom < 2`: counties only
  - `2–3.5`: counties fade out (opacity 0, translateY), and cities/districts fade in
  - `≥ 3.5`: all labels hidden
- **Secrets:** a filter drawer with categories from `categories.json` (per-category progress), live search, and "скрыть найденные".
- **Pin card:** a bottom sheet on mobile (swipe down to close) and a floating card on desktop. It has the screenshot, category, region, description, a "Поделиться ссылкой" button, and the "Найдено" checkbox.
- **Deep links:** `?pin=<id>`, or `t.me/<bot>?startapp=pin_<id>` (and `t.me/<bot>/<app>?startapp=…`), focus the map on that pin and open its card.
- **Freemium:** "found" marks live in `localStorage` (and Telegram CloudStorage when inside Telegram). After `VITE_FREE_LIMIT` (25) marks, the PRO modal opens.
- **Editor `?admin=1`:**
  - Polygons: clicks add vertices. A double-click closes the shape and copies the region JSON.
  - Pins: a click opens a form, which generates a `pins.json` entry with normalized `[Y, X]` and auto-detects the region.
- **Telegram:** `ready()`, `expand()`, `disableVerticalSwipes()` (so map drags don't close the app), theme colors → CSS variables, safe-area insets, the native BackButton for the sheet and panel, and haptics.
- **PWA:** manifest, plus a service worker. Tiles are cache-first, JSON is stale-while-revalidate, and the app shell works offline.

```
src/
  main.js            wiring
  config.js          env + constants (bounds, zooms, LOD thresholds)
  style.css          all styles (CSS variables, safe areas, Telegram theme)
  modules/
    map.js           CRS + tile layer
    data.js          fetch JSON from CDN, assign pin regions by point-in-polygon
    regions.js       polygons + highlight
    labels.js        floating labels + LOD
    pins.js          markers, filtering, focus
    panel.js         filters/search drawer
    sheet.js         pin card
    hud.js           region HUD
    pro.js           paywall modal
    share.js         share links + deep links
    store.js         found-progress (localStorage + Telegram CloudStorage)
    telegram.js      Telegram WebApp wrapper
    admin.js         ?admin=1 editor (lazy-loaded)
public/  manifest.webmanifest, icon.svg, sw.js
```

## Run locally

```bash
npm install
cp .env.example .env            # VITE_CDN_BASE_URL=http://localhost:8080

# terminal 1 — serve the tiles repo with CORS (repos side by side)
npm run tiles:serve             # = npx serve ../leonida-map-tiles/public -l 8080 --cors

# terminal 2
npm run dev                     # http://localhost:5173
                                # editor: http://localhost:5173/?admin=1
                                # deep link: http://localhost:5173/?pin=cash-vcia
```

## Full pipeline (both repos)

```bash
# 1) tiles
cd leonida-map-tiles
pip install -r scripts/requirements.txt
python scripts/build_tiles.py source/raw_map.jpg --clean
python scripts/make_pin_previews.py
git add . && git commit -m "tiles" && git push        # Cloudflare Pages, output dir: public

# 2) app
cd ../leonida-map-app
echo "VITE_CDN_BASE_URL=https://leonida-map-tiles.pages.dev" > .env
npm install && npm run build                          # -> dist/
```

### Deploy the app

- **Cloudflare Pages:** connect the repo. Build command `npm run build`, output `dist`, and add the `VITE_*` variables in *Settings → Environment variables*.
  Or: `npx wrangler pages deploy dist --project-name leonida-map-app`
- **GitHub Pages:** add repo *Variables* (`VITE_CDN_BASE_URL`, optionally `VITE_TG_BOT`, `VITE_TG_APP`, `VITE_FREE_LIMIT`, `VITE_PRO_URL`). Then set Settings → Pages → Source to *GitHub Actions*. The workflow `.github/workflows/pages.yml` builds and deploys.

### Hook up Telegram

1. In @BotFather: `/newbot`, then `/newapp` (or *Bot Settings → Menu Button*). Set the Web App URL to the deployed app (it must be HTTPS).
2. Put `VITE_TG_BOT=<bot_username>` in `.env`, and `VITE_TG_APP=<app_short_name>` if you created a named app with `/newapp`. Rebuild.
3. Shared links look like `https://t.me/<bot>?startapp=pin_<id>`. Pin ids must be `[A-Za-z0-9_-]`; the editor generates ids like that.

## Editing data

Open `/?admin=1` on any build.

- **Полигоны:** fill in id, name, type and color, then click around the region and double-click to finish. The JSON goes to the clipboard and the panel. Paste it into `leonida-map-tiles/public/regions.json`.
- **Метки:** click the map and fill in the form. The JSON goes to the clipboard. Paste it into `pins.json`, put the screenshot into `leonida-map-tiles/source/pins/<id>.png`, and run `make_pin_previews.py`.

Push the tiles repo and the app picks up the new JSON (JSON is cached for 5 minutes, tiles for 1 year).

## Notes

- The included regions and pins are a **draft / demo**. Polygons are traced roughly from the poster, and the 16 pins are placeholders (`"demo": true`). Refine them in the editor.
- The PRO limit is soft and client-side by design. Real payments (for example Telegram Stars) need a bot backend. Point `VITE_PRO_URL` at it and call `store.setPro(true)` after a verified payment.
