import { $ } from './utils.js';
import { isFound } from './store.js';

/** Compact bottom HUD: region name + "Найдено: X / Y". */
export function createHud(data) {
  const el = $('#hud');
  let region = null;

  const stats = (r) => {
    const list = data.pins.filter((p) => p.region === r.id);
    return { got: list.filter((p) => isFound(p.id)).length, total: list.length };
  };

  function show(r) {
    region = r;
    const { got, total } = stats(r);
    $('#hud-name').textContent = r.name;
    $('#hud-name').style.setProperty('--c', r.color);
    $('#hud-text').textContent = `Найдено: ${got} / ${total}`;
    $('#hud-bar').style.width = total ? `${(got / total) * 100}%` : '0%';
    el.style.setProperty('--c', r.color);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
  }

  function hide() {
    region = null;
    el.classList.remove('is-on');
    setTimeout(() => !region && (el.hidden = true), 250);
  }

  return { show, hide, refresh: () => region && show(region) };
}
