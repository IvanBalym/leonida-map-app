import L from 'leaflet';
import { LOD } from '../config.js';
import { esc } from './utils.js';

/**
 * "Levitating" labels with level-of-detail:
 *   zoom < 2          -> county names only
 *   2 <= zoom < 3.5   -> counties fade out (opacity 0, translateY(-10px)), cities/districts fade in
 *   zoom >= 3.5       -> all labels hidden, space is left for pin icons
 * The state is a data attribute on the map container; CSS does the animation.
 */
export function createLabels(map, labels) {
  const pane = map.createPane('labels');
  pane.style.zIndex = 450;
  pane.style.pointerEvents = 'none';

  labels.forEach((l, i) => {
    L.marker(l.pos, {
      pane: 'labels',
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: `flabel flabel--${l.type === 'county' ? 'county' : 'city'}`,
        html: `<span class="flabel__wrap"><span class="flabel__text" style="--d:${(i % 7) * -0.6}s">${esc(l.name)}</span></span>`,
        iconSize: null,
      }),
    }).addTo(map);
  });

  const container = map.getContainer();
  const update = () => {
    const z = map.getZoom();
    container.dataset.lod = z < LOD.cityFrom ? 'county' : z < LOD.hideFrom ? 'city' : 'none';
  };
  map.on('zoomend', update);
  update();
}
