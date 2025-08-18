import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type StudyPlanTargets = {
  getHeaderEl?: () => HTMLElement | null;
  getDatePickerEl?: () => HTMLElement | null;
  getDailyTabEl?: () => HTMLElement | null;
  getStatsTabEl?: () => HTMLElement | null;
  getMonthlyTabEl?: () => HTMLElement | null;
  getLeaderboardTabEl?: () => HTMLElement | null;
};

interface StudyPlanTourProps {
  userId?: string;
  targets?: StudyPlanTargets;
  forceOpenKey?: number; // Yeniden başlat tetikleyicisi
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: StudyPlanTargets): TourProps['steps'] => {
  const steps: TourProps['steps'] = [
    {
      title: 'Çalışma Programı',
      description: 'Günlük hedeflerinizi belirleyip ilerlemenizi buradan takip edersiniz.',
      target: resolveTarget(targets?.getHeaderEl),
    },
    {
      title: 'Tarih Seçimi',
      description: 'Farklı bir günün planını görmek için tarih seçin.',
      target: resolveTarget(targets?.getDatePickerEl),
    },
    {
      title: 'Günlük Tablo',
      description: 'Günlük planını tablo görünümünde düzenleyebilir ve ilerlemeyi takip edebilirsin.',
      target: resolveTarget(targets?.getDailyTabEl),
    },
    {
      title: 'İstatistikler',
      description: 'Günün performans özetini ve metrikleri burada görürsün.',
      target: resolveTarget(targets?.getStatsTabEl),
    },
    {
      title: 'Aylık Görünüm',
      description: 'Aylık takvim üzerinden planlarını büyük resimde takip et.',
      target: resolveTarget(targets?.getMonthlyTabEl),
    },
    {
      title: 'Liderlik',
      description: 'Sıralamadaki yerini ve topluluk aktivitelerini burada takip et.',
      target: resolveTarget(targets?.getLeaderboardTabEl),
    },
  ];

  return steps;
};

const StudyPlanTour: React.FC<StudyPlanTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  // Navbar tetikleyicisi (sessionStorage -> forceOpenKey -> open)
  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  // Global event ile tetikleme (AppLayout dev butonu)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-study-plan-tour' as any, handler as any);
    return () => window.removeEventListener('open-study-plan-tour' as any, handler as any);
  }, []);

  // Sayfaya ilk gelişi için kullanıcı bazlı guard
  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_study_plan` : 'tour_seen_guest_study_plan';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default StudyPlanTour;


