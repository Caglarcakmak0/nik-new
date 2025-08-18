import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type StudentCoachTargets = {
  getBannerEl?: () => HTMLElement | null;
  getProfileEl?: () => HTMLElement | null;
  getProgramsEl?: () => HTMLElement | null;
};

interface StudentCoachTourProps {
  userId?: string;
  targets?: StudentCoachTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: StudentCoachTargets): TourProps['steps'] => {
  return [
    {
      title: 'Koç Değerlendirme',
      description: 'Aylık koç değerlendirme durumunu burada takip edebilir ve formu açabilirsin.',
      target: resolveTarget(targets?.getBannerEl),
    },
    {
      title: 'Koç Profili',
      description: 'Koçunun bilgileri ve iletişim detayları burada.',
      target: resolveTarget(targets?.getProfileEl),
    },
    {
      title: 'Programların',
      description: 'Atanmış çalışma programlarını burada görüntüleyebilirsin.',
      target: resolveTarget(targets?.getProgramsEl),
    },
  ];
};

const StudentCoachTour: React.FC<StudentCoachTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-student-coach-tour' as any, handler as any);
    return () => window.removeEventListener('open-student-coach-tour' as any, handler as any);
  }, []);

  // Kullanıcı bazlı ilk gösterim
  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_student_coach` : 'tour_seen_guest_student_coach';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default StudentCoachTour;


