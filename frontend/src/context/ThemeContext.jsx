import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'travelmate_theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage can be unavailable in private/restricted contexts.
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply the theme to <html> so dark: variants and CSS overrides work app-wide.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  // Follow OS changes only while the user has not chosen a theme explicitly.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const handleChange = (event) => {
      let hasSavedPreference = false;
      try {
        hasSavedPreference = Boolean(localStorage.getItem(STORAGE_KEY));
      } catch {
        hasSavedPreference = false;
      }
      if (!hasSavedPreference) {
        setThemeState(event.matches ? 'dark' : 'light');
      }
    };

    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Persisting is best-effort; the theme still applies for this session.
    }
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
