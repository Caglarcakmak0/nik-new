import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type StudentDetailTargets = {
  getHeaderEl?: () => HTMLElement | null;
  getSummaryEl?: () => HTMLElement | null;
  getProgramsTableEl?: () => HTMLElement | null;
  getCreateProgramButtonEl?: () => HTMLElement | null;
};

interface StudentDetailTourProps {
  userId?: string;
  targets?: StudentDetailTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: StudentDetailTargets): TourProps['steps'] => {
  return [
    {
      title: 'Öğrenci Detayı',
      description: 'Öğrenci bilgilerini ve rozetlerini burada görürsün.',
      target: resolveTarget(targets?.getHeaderEl),
    },
    {
      title: 'Özet',
      description: 'Toplam çalışma süresi, oturum sayısı ve seri burada.',
      target: resolveTarget(targets?.getSummaryEl),
    },
    {
      title: 'Programlar',
      description: 'Öğrencinin program geçmişini ve durumlarını görürsün.',
      target: resolveTarget(targets?.getProgramsTableEl),
    },
    {
      title: 'Program Oluştur',
      description: 'Seçili öğrenci için yeni program başlat.',
      target: resolveTarget(targets?.getCreateProgramButtonEl),
    },
  ];
};

const StudentDetailTour: React.FC<StudentDetailTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-coach-student-detail-tour' as any, handler as any);
    return () => window.removeEventListener('open-coach-student-detail-tour' as any, handler as any);
  }, []);

  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_coach_student_detail` : 'tour_seen_guest_coach_student_detail';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default StudentDetailTour;


