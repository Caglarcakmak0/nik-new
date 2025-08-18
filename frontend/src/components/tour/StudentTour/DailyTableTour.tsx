import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type DailyTableTargets = {
  getFirstRowEl?: () => HTMLElement | null;
  getTableEl?: () => HTMLElement | null;
};

interface DailyTableTourProps {
  userId?: string;
  targets?: DailyTableTargets;
  forceOpenKey?: number; // Navbar veya dış tetikleme için
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: DailyTableTargets): TourProps['steps'] => {
  return [
    {
      title: 'Ders Satırını İncele',
      description: 'Çalışacağın dersin detaylarını görmek için tabloda ilgili satıra tıkla.',
      target: resolveTarget(targets?.getFirstRowEl) ?? resolveTarget(targets?.getTableEl),
    },
  ];
};

const DailyTableTour: React.FC<DailyTableTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  // Dış tetikleyici
  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  // Sayfaya ilk gelişte bir kez göster (kullanıcı bazlı)
  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_daily_table` : 'tour_seen_guest_daily_table';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default DailyTableTour;


