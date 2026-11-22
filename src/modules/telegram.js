/** Thin wrapper over Telegram.WebApp — every call is a no-op outside Telegram. */
export const tg = window.Telegram?.WebApp;
export const inTelegram = Boolean(tg && tg.initData);

const THEME_VARS = {
  bg_color: '--tg-bg',
  secondary_bg_color: '--tg-bg-2',
  text_color: '--tg-text',
  hint_color: '--tg-hint',
  link_color: '--tg-link',
  button_color: '--tg-button',
  button_text_color: '--tg-button-text',
};

function applyTheme() {
  const root = document.documentElement;
  const p = tg.themeParams || {};
  for (const [k, v] of Object.entries(THEME_VARS)) if (p[k]) root.style.setProperty(v, p[k]);
  root.dataset.theme = tg.colorScheme === 'light' ? 'light' : 'dark';
  try {
    tg.setHeaderColor?.(tg.colorScheme === 'light' ? '#f4f7fb' : '#070b16');
    tg.setBackgroundColor?.(tg.colorScheme === 'light' ? '#f4f7fb' : '#070b16');
  } catch { /* older clients */ }
}

function applyInsets() {
  const root = document.documentElement;
  const s = tg.safeAreaInset || {};
  const c = tg.contentSafeAreaInset || {};
  root.style.setProperty('--tg-safe-top', `${(s.top || 0) + (c.top || 0)}px`);
  root.style.setProperty('--tg-safe-bottom', `${(s.bottom || 0) + (c.bottom || 0)}px`);
}

export function initTelegram() {
  if (!inTelegram) return;
  document.documentElement.classList.add('in-tg');
  tg.ready();
  tg.expand();
  // Map is dragged vertically all the time — stop Telegram from collapsing the app on swipe.
  try { tg.disableVerticalSwipes?.(); } catch { /* Bot API < 7.7 */ }
  applyTheme();
  applyInsets();
  tg.onEvent('themeChanged', applyTheme);
  tg.onEvent('safeAreaChanged', applyInsets);
  tg.onEvent('contentSafeAreaChanged', applyInsets);
}

/** start_param from t.me/bot?startapp=XXX (also works when opened via direct link in browser). */
export function startParam() {
  return tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('tgWebAppStartParam') || '';
}

export function haptic(kind = 'light') {
  try {
    if (kind === 'success' || kind === 'error' || kind === 'warning') tg?.HapticFeedback?.notificationOccurred(kind);
    else tg?.HapticFeedback?.impactOccurred(kind);
  } catch { /* ignore */ }
}

export function openLink(url) {
  if (!url) return;
  if (inTelegram && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
  else if (inTelegram) tg.openLink(url);
  else window.open(url, '_blank', 'noopener');
}

/** Show Telegram's native Back button while a sheet/panel is open. Returns a disposer. */
export function useBackButton(onBack) {
  if (!inTelegram || !tg.BackButton) return () => {};
  tg.BackButton.onClick(onBack);
  tg.BackButton.show();
  return () => {
    tg.BackButton.offClick(onBack);
    tg.BackButton.hide();
  };
}

/** Telegram CloudStorage (per user, synced across devices). Resolves null when unavailable. */
export const cloud = {
  get(key) {
    return new Promise((res) => {
      if (!inTelegram || !tg.CloudStorage) return res(null);
      try { tg.CloudStorage.getItem(key, (err, v) => res(err ? null : v || null)); } catch { res(null); }
    });
  },
  set(key, value) {
    if (!inTelegram || !tg.CloudStorage) return;
    try { tg.CloudStorage.setItem(key, value); } catch { /* ignore */ }
  },
};
