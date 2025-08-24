import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectInitialTheme, setTheme as applyAndPersistTheme } from '../styles/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

interface ThemeProviderProps { children: ReactNode; }

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Tek kaynak: detectInitialTheme (body class + localStorage + system)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => detectInitialTheme());

  // Eski anahtar ("theme") varsa bir kerelik migrate et
  useEffect(() => {
    const legacy = localStorage.getItem('theme');
    if (legacy && (legacy === 'dark' || legacy === 'light')) {
      applyAndPersistTheme(legacy as ThemeMode);
      setThemeMode(legacy as ThemeMode);
      localStorage.removeItem('theme');
    } else {
      // ensure current applied (in case React strict remount cleared something)
      applyAndPersistTheme(themeMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State değişince kalıcı hale getir (theme.ts zaten class + storage günceller)
  useEffect(() => {
    applyAndPersistTheme(themeMode);
  }, [themeMode]);

  const isDark = themeMode === 'dark';
  const toggleTheme = () => setThemeMode(m => (m === 'light' ? 'dark' : 'light'));

  const value: ThemeContextType = { themeMode, isDark, setThemeMode, toggleTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};