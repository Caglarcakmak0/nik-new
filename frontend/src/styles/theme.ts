// Theme persistence utility
// Stores selected theme in localStorage under 'app-theme': 'dark' | 'light'
// Applies body class 'theme-dark' when dark
export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'app-theme';

export function detectInitialTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    if (document.body.classList.contains('theme-dark')) return 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: AppTheme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  document.body.classList.remove('theme-light');
  } else {
    document.body.classList.remove('theme-dark');
  document.body.classList.add('theme-light');
  }
}

export function setTheme(theme: AppTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  localStorage.setItem(STORAGE_KEY + '-manual', '1');
  applyTheme(theme);
}

export function initThemePersistence() {
  const initial = detectInitialTheme();
  applyTheme(initial);
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, initial);
  }
  if (!localStorage.getItem(STORAGE_KEY + '-manual')) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY + '-manual')) {
        const next = e.matches ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
      }
    };
    mq.addEventListener('change', handler);
  }
  const observer = new MutationObserver(() => {
    const isDark = document.body.classList.contains('theme-dark');
    const current: AppTheme = isDark ? 'dark' : 'light';
    const prev = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (prev !== current) {
      localStorage.setItem(STORAGE_KEY, current);
      // manual flag sadece kullanıcı tetiklediğinde zorunlu; observer'da dokunmayalım
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
