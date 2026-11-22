import { $, esc } from './utils.js';
import { isFound, ui } from './store.js';
import { useBackButton } from './telegram.js';

/** Filters drawer: category chips with progress, live search, "hide found", results list. */
export function createPanel(data, pinsApi, { onPick }) {
  const panel = $('#panel');
  const scrim = $('#scrim');
  const btn = $('#btn-filters');
  const search = $('#search');
  const chips = $('#chips');
  const results = $('#results');
  const hideFound = $('#hide-found');

  const saved = ui.get();
  const active = new Set(saved.cats?.filter((id) => data.catById.has(id)) ?? data.categories.map((c) => c.id));
  hideFound.checked = !!saved.hideFound;
  let disposeBack = () => {};

  function renderChips() {
    chips.innerHTML = data.categories
      .map((c) => {
        const all = data.pins.filter((p) => p.category === c.id);
        const got = all.filter((p) => isFound(p.id)).length;
        return `<button class="chip${active.has(c.id) ? ' is-on' : ''}" data-id="${esc(c.id)}" style="--c:${esc(c.color)}" aria-pressed="${active.has(c.id)}">
          <span class="chip__icon">${esc(c.icon)}</span><span class="chip__name">${esc(c.name)}</span><span class="chip__count">${got}/${all.length}</span></button>`;
      })
      .join('');
  }

  function renderResults(list) {
    const q = search.value.trim();
    if (!q) {
      results.innerHTML = '';
      return;
    }
    results.innerHTML = list.length
      ? list
          .slice(0, 50)
          .map((p) => {
            const c = data.catById.get(p.category);
            const r = data.regionById.get(p.region);
            return `<li><button data-id="${esc(p.id)}"><span class="res__icon" style="--c:${esc(c?.color)}">${esc(c?.icon)}</span>
              <span class="res__text"><b>${esc(p.name)}</b><small>${esc(r?.name || '')}</small></span>${isFound(p.id) ? '<span class="res__ok">✓</span>' : ''}</button></li>`;
          })
          .join('')
      : `<li class="results__empty">Ничего не найдено</li>`;
  }

  function apply() {
    const list = pinsApi.setFilter({ cats: active, query: search.value, hideFound: hideFound.checked });
    renderResults(list);
    ui.patch({ cats: [...active], hideFound: hideFound.checked });
  }

  function open() {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    scrim.hidden = false;
    disposeBack = useBackButton(close);
  }
  function close() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
    search.blur();
    disposeBack();
  }

  btn.addEventListener('click', () => (panel.classList.contains('is-open') ? close() : open()));
  $('#btn-panel-close').addEventListener('click', close);
  scrim.addEventListener('click', close);
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const id = b.dataset.id;
    active.has(id) ? active.delete(id) : active.add(id);
    renderChips();
    apply();
  });
  $('#cats-all').addEventListener('click', () => {
    data.categories.forEach((c) => active.add(c.id));
    renderChips();
    apply();
  });
  $('#cats-none').addEventListener('click', () => {
    active.clear();
    renderChips();
    apply();
  });
  hideFound.addEventListener('change', apply);
  search.addEventListener('input', apply);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') results.querySelector('button')?.click();
    if (e.key === 'Escape') close();
  });
  results.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const pin = data.pins.find((p) => p.id === b.dataset.id);
    if (window.innerWidth < 900) close();
    onPick?.(pin);
  });

  renderChips();
  apply();

  return {
    open,
    close,
    refresh() {
      renderChips();
      apply();
    },
  };
}
