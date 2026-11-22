import L from 'leaflet';

/**
 * Region polygons with neon hover/tap highlight. Visual states live in CSS (.region / .region--hot)
 * so transitions are smooth; Leaflet only sets colors.
 */
export function createRegions(map, regions, { onSelect, onClear }) {
  const pane = map.createPane('regions');
  pane.style.zIndex = 410;
  const renderer = L.svg({ pane: 'regions', padding: 0.5 });

  // Counties first, then smaller areas on top so they stay clickable.
  const ordered = [...regions].sort((a, b) => (a.type !== 'county') - (b.type !== 'county'));
  const layers = new Map();
  let hovered = null;
  let selected = null;

  const setHot = (id, on) => {
    const el = layers.get(id)?.getElement();
    if (el) el.classList.toggle('region--hot', on);
  };

  for (const r of ordered) {
    const layer = L.polygon(r.polygon, {
      renderer,
      pane: 'regions',
      color: r.color,
      fillColor: r.color,
      weight: 2,
      className: `region region--${r.type}`,
    }).addTo(map);
    layer.getElement()?.style.setProperty('--glow', r.color);
    layers.set(r.id, layer);

    layer.on('mouseover', () => {
      hovered = r.id;
      setHot(r.id, true);
      onSelect?.(r, { preview: true });
    });
    layer.on('mouseout', () => {
      if (hovered === r.id) hovered = null;
      if (selected !== r.id) setHot(r.id, false);
      if (selected) onSelect?.(regions.find((x) => x.id === selected), { preview: true });
      else onClear?.();
    });
    layer.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      select(r.id, { fly: true });
    });
  }

  function select(id, { fly = false } = {}) {
    if (selected && selected !== id) setHot(selected, false);
    selected = id;
    setHot(id, true);
    const r = regions.find((x) => x.id === id);
    onSelect?.(r, { preview: false });
    if (fly) map.flyToBounds(layers.get(id).getBounds(), { padding: [48, 48], duration: 0.7, maxZoom: 4 });
  }

  function clear() {
    if (selected) setHot(selected, false);
    selected = null;
    onClear?.();
  }

  map.on('click', clear);

  return {
    select,
    clear,
    get selected() { return selected; },
    setInteractive(on) { pane.classList.toggle('is-passive', !on); },
  };
}
