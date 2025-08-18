import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type ProgramManagerTargets = {
  getFiltersEl?: () => HTMLElement | null;
  getTableEl?: () => HTMLElement | null;
  getEditModalEl?: () => HTMLElement | null;
  getDeleteMockEl?: () => HTMLElement | null;
};

interface ProgramManagerTourProps {
  userId?: string;
  targets?: ProgramManagerTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: ProgramManagerTargets): TourProps['steps'] => {
  return [
    {
      title: 'Filtreler',
      description: 'Öğrenci ve tarih filtresi ile programları daralt.',
      target: resolveTarget(targets?.getFiltersEl),
    },
    {
      title: 'Programlar Tablosu',
      description: 'Programların durumlarını ve işlemleri görüntüle.',
      target: resolveTarget(targets?.getTableEl),
    },
    {
      title: 'Düzenleme',
      description: 'Program ayrıntılarını düzenlemek için tıklayın.',
      target: resolveTarget(targets?.getEditModalEl),
    },
    {
      title: 'Mock Temizleme',
      description: 'Test verilerini temizlemek için bu butonu kullan.',
      target: resolveTarget(targets?.getDeleteMockEl),
    },
  ];
};

const ProgramManagerTour: React.FC<ProgramManagerTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-coach-program-manager-tour' as any, handler as any);
    return () => window.removeEventListener('open-coach-program-manager-tour' as any, handler as any);
  }, []);

  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_coach_program_manager` : 'tour_seen_guest_coach_program_manager';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default ProgramManagerTour;


