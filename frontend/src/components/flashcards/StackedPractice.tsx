import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { Flashcard } from '../../services/api';

export interface StackedPracticeProps {
  cards: Flashcard[];
  index: number;
  onAnswer: (correct: boolean) => void;
  diffColor: (d:number)=>string;
  onNavigate?: (nextIndex: number) => void; // optional deck navigation (wheel / up & down keys)
}

// Basic stacked animation via translate / scale (top card interactive)
export const StackedPractice: React.FC<StackedPracticeProps> = ({ cards, index, onAnswer, diffColor, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const current = cards[index];
  const total = cards.length;
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [answering, setAnswering] = useState<null | 'left' | 'right'>(null);

  const topCardRef = useRef<HTMLDivElement>(null);

  // Deterministic gradient palette per card id for stable coloring
  const palette = useRef<string[]>([
    'linear-gradient(135deg,#1e3a8a,#312e81)',
    'linear-gradient(135deg,#064e3b,#065f46)',
    'linear-gradient(135deg,#7f1d1d,#991b1b)',
    'linear-gradient(135deg,#3730a3,#6366f1)',
    'linear-gradient(135deg,#6d28d9,#7e22ce)',
    'linear-gradient(135deg,#9d174d,#be123c)',
    'linear-gradient(135deg,#065f46,#0d9488)',
    'linear-gradient(135deg,#047857,#059669)',
    'linear-gradient(135deg,#b45309,#d97706)'
  ]);
  const gradientFor = (id: string | undefined, fallbackIndex:number) => {
    if (!id) return palette.current[fallbackIndex % palette.current.length];
    let hash = 0; for (let i=0;i<id.length;i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return palette.current[hash % palette.current.length];
  };

  // Reset flip when index changes
  useEffect(() => { setFlipped(false); }, [index]);
  useEffect(() => { setDragX(0); setDragging(false); setAnswering(null); }, [index]);

  const flip = useCallback(() => {
    if (!current) return; setFlipped(f => !f); }, [current]);

  useEffect(() => {
    // auto focus for keyboard
    containerRef.current?.focus();
  }, [index]);

  // Keyboard shortcuts (global) + local fallback
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); return; }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!flipped) { flip(); return; }
        onAnswer(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!flipped) { flip(); return; }
        onAnswer(false);
      } else if (e.key === 'ArrowDown') {
        if (flipped || answering) return; // only navigate when front side
        if (onNavigate && index + 1 < cards.length) { e.preventDefault(); onNavigate(index + 1); }
      } else if (e.key === 'ArrowUp') {
        if (flipped || answering) return;
        if (onNavigate && index - 1 >= 0) { e.preventDefault(); onNavigate(index - 1); }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [current, flipped, flip, onAnswer, onNavigate, answering, index, cards.length]);

  const onKeyDown = () => { /* focus handler intentionally empty */ };

  // Basic touch swipe (horizontal) when flipped: right = correct, left = wrong
  useEffect(() => {
    let startX = 0; let startY = 0; let active = false;
    const el = containerRef.current;
    if (!el) return;
    const touchStart = (e: TouchEvent) => {
      if (!current) return; if (e.touches.length !== 1) return; active = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const touchMove = (e: TouchEvent) => {
      if (!active) return; const dx = e.touches[0].clientX - startX; const dy = e.touches[0].clientY - startY; if (Math.abs(dy) > 120) { return; }
      if (!flipped) { // allow slight preview rotation
        setDragX(dx);
      } else {
        setDragX(dx);
      }
    };
    const touchEnd = (e: TouchEvent) => {
      if (!active) return; active = false; const dx = e.changedTouches[0].clientX - startX; const dy = e.changedTouches[0].clientY - startY; finalizeSwipe(dx, dy); };
    el.addEventListener('touchstart', touchStart, { passive: true });
    el.addEventListener('touchmove', touchMove, { passive: true });
    el.addEventListener('touchend', touchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', touchStart); el.removeEventListener('touchmove', touchMove); el.removeEventListener('touchend', touchEnd); };
  }, [current, flipped, flip, onAnswer]);

  // Mouse drag (desktop)
  useEffect(() => {
    const el = topCardRef.current; if (!el) return;
    let startX = 0; let startY = 0; let down = false;
    const downHandler = (e: MouseEvent) => { if (!current) return; down = true; startX = e.clientX; startY = e.clientY; setDragging(true); };
    const moveHandler = (e: MouseEvent) => { if (!down) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dy) > 160) return; setDragX(dx); };
    const upHandler = (e: MouseEvent) => { if (!down) return; down = false; setDragging(false); const dx = e.clientX - startX; const dy = e.clientY - startY; finalizeSwipe(dx, dy); };
    el.addEventListener('mousedown', downHandler);
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    return () => { el.removeEventListener('mousedown', downHandler); window.removeEventListener('mousemove', moveHandler); window.removeEventListener('mouseup', upHandler); };
  }, [current, flipped, onAnswer, flip]);

  // Wheel navigation (only when not flipped & not dragging/answering)
  useEffect(() => {
    if (!onNavigate) return;
    const el = containerRef.current; if (!el) return;
    let last = 0;
    const handler = (e: WheelEvent) => {
      if (flipped || dragging || answering) return;
      if (Math.abs(e.deltaY) < 12) return;
      const now = Date.now();
      if (now - last < 170) return; // throttle
      if (e.deltaY > 0 && index + 1 < cards.length) {
        e.preventDefault();
        onNavigate(index + 1);
      } else if (e.deltaY < 0 && index - 1 >= 0) {
        e.preventDefault();
        onNavigate(index - 1);
      }
      last = now;
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onNavigate, flipped, dragging, answering, index, cards.length]);

  const finalizeSwipe = (dx: number, dy: number) => {
    setDragging(false);
    const threshold = 110; // px
    if (Math.abs(dx) < threshold || Math.abs(dy) > 140) {
      // Not enough swipe => if not flipped and small horizontal flick treat as flip
      if (!flipped && Math.abs(dx) > 40 && Math.abs(dy) < 60) { flip(); }
      setDragX(0);
      return;
    }
    if (!flipped) {
      // Long swipe also flips (but does NOT answer yet)
      flip();
      setDragX(0);
      return;
    }
    // Animate out then answer
    const dir: 'left' | 'right' = dx > 0 ? 'right' : 'left';
    setAnswering(dir);
    // let animation run then propagate answer
    setTimeout(() => { onAnswer(dir === 'right'); setAnswering(null); setDragX(0); }, 260);
  };

  // Button click answer with same animation
  const answerWithAnimation = (correct: boolean) => {
    if (answering) return;
    // require flipped to avoid accidental front-side triggers
    if (!flipped) { flip(); return; }
    const dir: 'left' | 'right' = correct ? 'right' : 'left';
    setAnswering(dir);
    setTimeout(() => { onAnswer(correct); setAnswering(null); setDragX(0); }, 260);
  };

  if (!current) return null;

  return (
  <div className="stacked-wrapper" ref={containerRef} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="stacked-cards">
        {cards.slice(index, index+5).map((c, i) => {
          const isTop = i === 0;
          const gradient = gradientFor(c._id, index + i);
          return (
            <div
              key={c._id}
              ref={isTop ? topCardRef : undefined}
              className={[
                'stacked-card',
                isTop && flipped ? 'flipped' : '',
                isTop && dragging ? 'dragging' : '',
                isTop && answering ? `answering ${answering}` : '',
                isTop && Math.abs(dragX) > 100 && flipped ? (dragX > 0 ? 'swipe-right' : 'swipe-left') : ''
              ].filter(Boolean).join(' ')}
              style={{
                transform: answering
                  ? `translateY(${i*8}px) scale(${1 - i*0.04}) translateX(${answering==='right'? 560 : -560}px) rotate(${answering==='right'? 35 : -35}deg)`
                  : `translateY(${i*8}px) scale(${1 - i*0.04}) ${isTop ? `translateX(${dragX}px) rotate(${dragX/18}deg)` : ''}`,
                zIndex: 10 - i,
                transition: dragging ? 'none' : 'transform .45s cubic-bezier(.65,.05,.36,1)'
              }}
              onClick={() => isTop && !dragging && !answering && Math.abs(dragX) < 5 && flip()}
            >
              <div className="stacked-inner">
                <div className="stacked-face front colorized" style={{ background: gradient }}>
                  <div className="meta">
                    <Tag color="purple">{c.topic}</Tag>
                    <Tag color={diffColor(c.stats?.difficulty || 3)}>Z{c.stats?.difficulty || 3}</Tag>
                    <Tag color='gold'>{c.successRate ?? 0}%</Tag>
                  </div>
                  <div className="content markdown">
                    <ReactMarkdown>{c.question}</ReactMarkdown>
                  </div>
                  <div className="hint">Çevir: Space / Tap — Cevap: Sağ=Bildim Sol=Bilemedim (Swipe/Ok)</div>
                </div>
                <div className="stacked-face back colorized" style={{ background: gradient }}>
                  <div className="meta">
                    <Tag color="purple">{c.topic}</Tag>
                    <Tag color={diffColor(c.stats?.difficulty || 3)}>Z{c.stats?.difficulty || 3}</Tag>
                    <Tag color='gold'>{c.successRate ?? 0}%</Tag>
                  </div>
                  <div className="content markdown">
                    <ReactMarkdown>{c.answer}</ReactMarkdown>
                  </div>
                  <Space className="actions">
                    <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => answerWithAnimation(true)} disabled={!!answering}>Bildim</Button>
                    <Button danger size="small" icon={<CloseOutlined />} onClick={() => answerWithAnimation(false)} disabled={!!answering}>Bilemedim</Button>
          <Button size="small" icon={<EyeOutlined />} onClick={flip} disabled={!!answering}>Çevir</Button>
                  </Space>
                  {isTop && flipped && (
                    <>
                      <div className="swipe-indicator right">BİLDİM</div>
                      <div className="swipe-indicator left">BİLEMEDİM</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {index + 3 >= total && (
          <div className="stacked-end">Son kartlar</div>
        )}
      </div>
      <div className="stacked-progress">{index + 1} / {total}</div>
    </div>
  );
};

export default StackedPractice;
