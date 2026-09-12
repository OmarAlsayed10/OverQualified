import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { applyPalette } from '../theme/palettes';

export type ThemeMode = 'light' | 'dark';

interface ThemeModeValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

export const ThemeModeContext = createContext<ThemeModeValue | null>(null);

const STORAGE_KEY = 'themeMode';

const initialMode = (): ThemeMode => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
};

export const ThemeModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    applyPalette(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};
