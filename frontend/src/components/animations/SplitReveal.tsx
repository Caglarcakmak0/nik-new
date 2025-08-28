import React, { useEffect, useState } from 'react';
import './SplitReveal.scss';

interface SplitRevealProps {
  children: React.ReactNode;
  /** Opsiyonel: kaplama renk (default modal background) */
  coverColor?: string;
  /** Animasyon süresi ms (CSS ile uyumlu) */
  duration?: number;
}

const SplitReveal: React.FC<SplitRevealProps> = ({ children, coverColor, duration = 600 }) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 30); // first paint sonrası tetikleyelim
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`split-reveal ${animate ? 'is-animating' : ''}`} style={{ ['--split-duration' as any]: duration + 'ms' }}>
      <div className="split-cover top" style={coverColor ? { background: coverColor } : undefined} />
      <div className="split-cover bottom" style={coverColor ? { background: coverColor } : undefined} />
      <div className="split-inner">{children}</div>
    </div>
  );
};

export default SplitReveal;
