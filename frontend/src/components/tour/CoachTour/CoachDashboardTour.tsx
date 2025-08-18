import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type CoachDashboardTargets = {
  getHeaderEl?: () => HTMLElement | null;
  getStatsCardsEl?: () => HTMLElement | null;
  getCreateButtonEl?: () => HTMLElement | null;
  getTableEl?: () => HTMLElement | null;
};

interface CoachDashboardTourProps {
  userId?: string;
  targets?: CoachDashboardTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: CoachDashboardTargets): TourProps['steps'] => {
  return [
    {
      title: 'Koç Paneli',
      description: 'Öğrenci ve program yönetimi için genel bakış.',
      target: resolveTarget(targets?.getHeaderEl),
    },
    {
      title: 'İstatistik Kartları',
      description: 'Toplam öğrenci ve bugünkü plan sayısını burada görürsün.',
      target: resolveTarget(targets?.getStatsCardsEl),
    },
    {
      title: 'Yeni Program',
      description: 'Buradan hızlıca yeni bir program oluşturabilirsin.',
      target: resolveTarget(targets?.getCreateButtonEl),
    },
    {
      title: 'Öğrenci Tablosu',
      description: 'Öğrencilerini, plan durumlarını ve işlemleri buradan yönet.',
      target: resolveTarget(targets?.getTableEl),
    },
  ];
};

const CoachDashboardTour: React.FC<CoachDashboardTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-coach-dashboard-tour' as any, handler as any);
    return () => window.removeEventListener('open-coach-dashboard-tour' as any, handler as any);
  }, []);

  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_coach_dashboard` : 'tour_seen_guest_coach_dashboard';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default CoachDashboardTour;


