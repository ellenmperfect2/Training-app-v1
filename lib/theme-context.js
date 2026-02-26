'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { DARK, LIGHT, getTheme, getStoredTheme, setStoredTheme } from '@/lib/theme';

const ThemeContext = createContext({
  theme: LIGHT,
  themeId: 'light',
  toggleTheme: () => {},
});

/**
 * Maps Summit theme tokens onto the existing CSS custom properties so that
 * all Tailwind color utilities (bg-glacier-*, text-glacier-*, etc.) respond
 * to theme changes without component rewrites.
 */
function applyCssVars(T) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Surfaces
  root.style.setProperty('--bg',           T.bg);
  root.style.setProperty('--bg-card',      T.bg2);
  root.style.setProperty('--bg-card-alt',  T.surface);
  root.style.setProperty('--border',       T.line);
  root.style.setProperty('--border-hover', T.surface);

  // Text
  root.style.setProperty('--text-primary',   T.ink);
  root.style.setProperty('--text-secondary', T.inkMid);
  root.style.setProperty('--text-muted',     T.inkDim);

  // Accents
  root.style.setProperty('--accent',        T.moss);
  root.style.setProperty('--accent-soft',   T.inkFaint);
  root.style.setProperty('--success',       T.mossHi);
  root.style.setProperty('--success-soft',  T.inkFaint);
  root.style.setProperty('--warning',       T.sand);
  root.style.setProperty('--warning-soft',  T.sand + '22');
  root.style.setProperty('--danger',        T.warn);
  root.style.setProperty('--danger-soft',   T.warn + '22');
  root.style.setProperty('--fatigued',      T.warn);
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState('light');

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeId(stored);
    applyCssVars(getTheme(stored));
  }, []);

  function toggleTheme() {
    const next = themeId === 'dark' ? 'light' : 'dark';
    setThemeId(next);
    setStoredTheme(next);
    applyCssVars(getTheme(next));
  }

  const theme = getTheme(themeId);

  return (
    <ThemeContext.Provider value={{ theme, themeId, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
