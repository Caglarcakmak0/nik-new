import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type StudentsListTargets = {
  getSearchEl?: () => HTMLElement | null;
  getTableEl?: () => HTMLElement | null;
  getRefreshEl?: () => HTMLElement | null;
};

interface StudentsListTourProps {
  userId?: string;
  targets?: StudentsListTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: StudentsListTargets): TourProps['steps'] => {
  return [
    {
      title: 'Öğrenci Arama',
      description: 'Öğrencileri isim veya e-posta ile burada arayabilirsin.',
      target: resolveTarget(targets?.getSearchEl),
    },
    {
      title: 'Liste',
      description: 'Öğrencilerin temel bilgileri ve plan sayıları burada.',
      target: resolveTarget(targets?.getTableEl),
    },
    {
      title: 'Yenile',
      description: 'Verileri güncellemek için yenile butonunu kullan.',
      target: resolveTarget(targets?.getRefreshEl),
    },
  ];
};

const StudentsListTour: React.FC<StudentsListTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-coach-students-list-tour' as any, handler as any);
    return () => window.removeEventListener('open-coach-students-list-tour' as any, handler as any);
  }, []);

  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_coach_students_list` : 'tour_seen_guest_coach_students_list';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default StudentsListTour;


