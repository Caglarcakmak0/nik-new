import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';

export type CreateProgramTargets = {
  getStudentSelectEl?: () => HTMLElement | null;
  getDatePickerEl?: () => HTMLElement | null;
  getSubjectsListEl?: () => HTMLElement | null;
  getSubmitButtonEl?: () => HTMLElement | null;
};

interface CreateProgramTourProps {
  userId?: string;
  targets?: CreateProgramTargets;
  forceOpenKey?: number;
}

const resolveTarget = (getter?: () => HTMLElement | null): (() => HTMLElement) | undefined => {
  if (!getter) return undefined;
  const el = getter();
  if (!el) return undefined;
  return () => el;
};

const getSteps = (targets?: CreateProgramTargets): TourProps['steps'] => {
  return [
    {
      title: 'Öğrenci Seçimi',
      description: 'Programı oluşturmak istediğin öğrenciyi seç.',
      target: resolveTarget(targets?.getStudentSelectEl),
    },
    {
      title: 'Tarih',
      description: 'Program tarihini burada belirle.',
      target: resolveTarget(targets?.getDatePickerEl),
    },
    {
      title: 'Dersler',
      description: 'Dersleri, açıklamalarını ve sürelerini ekle.',
      target: resolveTarget(targets?.getSubjectsListEl),
    },
    {
      title: 'Oluştur',
      description: 'Formu tamamlayıp programı oluştur.',
      target: resolveTarget(targets?.getSubmitButtonEl),
    },
  ];
};

const CreateProgramTour: React.FC<CreateProgramTourProps> = ({ userId, targets, forceOpenKey }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(targets), [targets]);

  useEffect(() => {
    if (forceOpenKey) setOpen(true);
  }, [forceOpenKey]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-coach-create-program-tour' as any, handler as any);
    return () => window.removeEventListener('open-coach-create-program-tour' as any, handler as any);
  }, []);

  useEffect(() => {
    const key = userId ? `tour_seen_${userId}_coach_create_program` : 'tour_seen_guest_coach_create_program';
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOpen(true);
      try { localStorage.setItem(key, '1'); } catch {}
    }
  }, [userId]);

  return <Tour open={open} onClose={() => setOpen(false)} steps={steps} />;
};

export default CreateProgramTour;


