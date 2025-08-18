import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type DesignMode = 'soft' | 'neon';

type DesignContextType = {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
};

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export const useDesign = (): DesignContextType => {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used within a DesignProvider');
  return ctx;
};

const STORAGE_KEY = 'design-mode';

export const DesignProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [designMode, setDesignMode] = useState<DesignMode>('neon');

  // load from storage
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as DesignMode) || 'neon';
    if (saved) setDesignMode(saved);
  }, []);

  // persist and toggle body class
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, designMode);
    const classNames: Record<DesignMode, string> = {
      soft: 'design-soft',
      neon: 'design-neon',
    };
    const all = Object.values(classNames);
    document.body.classList.remove(...all);
    document.body.classList.add(classNames[designMode]);
  }, [designMode]);

  const value = useMemo(() => ({ designMode, setDesignMode }), [designMode]);

  return (
    <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
  );
};


