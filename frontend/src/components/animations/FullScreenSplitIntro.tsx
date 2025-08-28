import React, { useEffect, useState } from 'react';
import './FullScreenSplitIntro.scss';

interface FullScreenSplitIntroProps {
  /** Panel açılma (yukarı/aşağı kayma) süresi ms */
  duration?: number; // default 1200
  /** Fade out süresi ms (panel açılmasından sonra) */
  fadeDuration?: number; // default 400
  /** Tamamlandığında tetiklenir (fade bitince) */
  onFinish?: () => void;
  /** Opsiyonel: düz arka plan rengi (image yoksa) */
  coverColor?: string;
  /** Opsiyonel: arka plan görseli (tam ekran) */
  imageSrc?: string;
  /** Z-index */
  zIndex?: number;
  /** İsteğe bağlı ortada küçük bir label */
  label?: string;
}

const FullScreenSplitIntro: React.FC<FullScreenSplitIntroProps> = ({
  duration = 1200,
  fadeDuration = 800,
  onFinish,
  coverColor,
  imageSrc,
  zIndex = 2000,
  label
}) => {
  const [animate, setAnimate] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startT = setTimeout(() => setAnimate(true), 20);
    const fadeT = setTimeout(() => setFading(true), duration); // start fade after slide
    const endT = setTimeout(() => { onFinish && onFinish(); }, duration + fadeDuration);
    return () => { clearTimeout(startT); clearTimeout(fadeT); clearTimeout(endT); };
  }, [duration, fadeDuration, onFinish]);

  return (
    <div
      className={`fs-split-intro ${animate ? 'is-animating' : ''} ${fading ? 'is-fading' : ''}`}
      style={{ ['--fs-split-duration' as any]: duration + 'ms', ['--fs-split-fade' as any]: fadeDuration + 'ms', zIndex }}
    >
      <div
        className={"fs-panel top" + (imageSrc ? ' with-image' : '')}
        style={imageSrc ? { ['--fs-img' as any]: `url(${imageSrc})`, background: 'transparent' } : coverColor ? { background: coverColor } : undefined}
      />
      <div
        className={"fs-panel bottom" + (imageSrc ? ' with-image' : '')}
        style={imageSrc ? { ['--fs-img' as any]: `url(${imageSrc})`, background: 'transparent' } : coverColor ? { background: coverColor } : undefined}
      />
      {label && <div className="fs-center-label">{label}</div>}
    </div>
  );
};

export default FullScreenSplitIntro;
