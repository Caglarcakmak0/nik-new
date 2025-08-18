import React, { useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { markTutorialSeen } from '../../services/api';

type Role = 'student' | 'coach' | 'admin' | undefined;

export type OnboardingTargets = {
  getSiderEl?: () => HTMLElement | null | undefined;
  getCollapseButtonEl?: () => HTMLElement | null | undefined;
  getThemeButtonEl?: () => HTMLElement | null | undefined;
  getProfileEl?: () => HTMLElement | null | undefined;
  // Gelecekte başka hedefler eklenecekse buraya eklenebilir
};

interface OnboardingTourProps {
  userId?: string;
  hasSeenTutorial?: boolean;
  role?: Role;
  targets?: OnboardingTargets;
  onCompleted?: () => void; // hasSeenTutorial işaretlendikten sonra çağrılır
  forceOpenKey?: number; // değiştiğinde turu zorla açar (yeniden başlat)
}

const getSteps = (role: Role, targets?: OnboardingTargets): TourProps['steps'] => {
  const steps: TourProps['steps'] = [
    {
      title: 'Menü',
      description: 'Sol menüden sayfalar arasında gezinebilirsin.',
      target: () => targets?.getSiderEl?.() || null,
    },
    {
      title: 'Menüyü Aç/Kapat',
      description: 'Bu butonla sol menüyü daraltabilir ya da genişletebilirsin.',
      target: () => targets?.getCollapseButtonEl?.() || null,
    },
    {
      title: 'Tema',
      description: 'Işık/Karanlık modu buradan değiştirebilirsin.',
      target: () => targets?.getThemeButtonEl?.() || null,
    },
    {
      title: 'Profil',
      description: 'Profil bilgilerine buradan ulaşabilir ve düzenleyebilirsin.',
      target: () => targets?.getProfileEl?.() || null,
    },
  ];

  // Rol bazlı ekstra adımlar (hedef bulunamazsa merkezde gösterilir)
  if (role === 'student') {
    steps.push({
      title: 'Hedefler ve İlerleme',
      description: 'Dashboard’da aktif hedeflerini ve ilerlemeni buradan takip edebilirsin.',
    });
  } else if (role === 'coach') {
    steps.push({
      title: 'Koç Araçları',
      description: 'Öğrencilerin ve performans istatistikleri için menüdeki ilgili bölümleri kullanabilirsin.',
    });
  } else if (role === 'admin') {
    steps.push({
      title: 'Yönetim Paneli',
      description: 'Kullanıcı ve koç yönetimi ile istatistiklere menüden erişebilirsin.',
    });
  }

  return steps;
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  userId,
  hasSeenTutorial,
  role,
  targets,
  onCompleted,
  forceOpenKey,
}) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => getSteps(role, targets), [role, targets]);

  // Zorla açma tetikleyicisi
  useEffect(() => {
    if (forceOpenKey) {
      setOpen(true);
    }
  }, [forceOpenKey]);

  // İlk kez gösterme mantığı (session guard)
  useEffect(() => {
    if (!userId) return;
    if (hasSeenTutorial) return;

    const sessionKey = `tour_shown_${userId}`;
    const alreadyShown = sessionStorage.getItem(sessionKey);
    if (!alreadyShown) {
      setOpen(true);
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [userId, hasSeenTutorial]);

  const handleClose = async () => {
    setOpen(false);
    // Eğer zaten işaretlenmişse tekrar API çağrısı yapma
    if (userId && !hasSeenTutorial) {
      try {
        await markTutorialSeen();
        onCompleted?.();
      } catch (e) {
        // Sessizce geç
      }
    }
  };

  return (
    <Tour open={open} onClose={handleClose} steps={steps} />
  );
};

export default OnboardingTour;


