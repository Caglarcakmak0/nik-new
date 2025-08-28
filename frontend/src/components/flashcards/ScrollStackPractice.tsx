import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { Flashcard } from '../../services/api';
import './ScrollStackPractice.scss';

export interface ScrollStackPracticeProps {
  cards: Flashcard[];
  index: number;
  onAnswer: (correct: boolean) => void;
  diffColor: (d:number)=>string;
  onNavigate: (nextIndex: number) => void;
}

const CARD_PEN_OFFSET = 10; // spacing
const CARD_SWITCH_RANGE = 130; // percent of height

const clamp = (v:number,min:number,max:number)=> Math.min(max, Math.max(min,v));

const ScrollStackPractice: React.FC<ScrollStackPracticeProps> = ({ cards, index, onAnswer, diffColor, onNavigate }) => {
  const [flipped, setFlipped] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState<'up'|'down'|null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showPrevOverlay, setShowPrevOverlay] = useState(false);

  useEffect(()=> { setFlipped(false); }, [index]);
  useEffect(()=> { wrapperRef.current?.focus(); }, [index]);
  useEffect(()=> { setShowPrevOverlay(false); }, [index]);

  const doFlip = useCallback(()=> setFlipped(f=>!f), []);

  useEffect(()=> {
    const handler = (e: KeyboardEvent) => {
      if (!cards.length) return;
      const t = e.target as HTMLElement; if (['INPUT','TEXTAREA'].includes(t?.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doFlip(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); navigateDown(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); navigateUp(); }
      else if (e.key === 'ArrowRight') { if (!flipped) { doFlip(); return; } answer(true); }
      else if (e.key === 'ArrowLeft') { if (!flipped) { doFlip(); return; } answer(false); }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [cards.length, doFlip, flipped, index]);

  useEffect(()=> {
    const el = wrapperRef.current; if (!el) return;
    let last = 0;
    const wheel = (e: WheelEvent) => {
      // Always prevent default while hovering to stop page scroll
      e.preventDefault();
      if (flipped || isMoving) return;
      if (Math.abs(e.deltaY) < 15) return;
      const now = Date.now(); if (now - last < 160) return;
      if (e.deltaY > 0) navigateDown(); else if (e.deltaY < 0) navigateUp();
      last = now;
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return ()=> el.removeEventListener('wheel', wheel);
  }, [flipped, isMoving, index, cards.length]);

  const navigateDown = () => {
    if (isMoving) return; if (index >= cards.length - 1) return;
    setDirection('down'); setIsMoving(true);
    setTimeout(()=> { onNavigate(clamp(index+1,0,cards.length-1)); setIsMoving(false); setDirection(null); }, 300);
  };
  const navigateUp = () => {
    if (isMoving) return; if (index <= 0) return;
    setDirection('up'); setShowPrevOverlay(true); setIsMoving(true);
    setTimeout(()=> { onNavigate(clamp(index-1,0,cards.length-1)); setIsMoving(false); setDirection(null); }, 300);
  };

  const answer = (correct:boolean) => {
    if (!flipped) { doFlip(); return; }
    onAnswer(correct);
    if (index < cards.length - 1) navigateDown();
  };

  if (!cards.length) return null;
  const windowCards = cards.slice(index, index+5);
  const prevCard = index > 0 ? cards[index-1] : null;

  // Solid color helpers (no gradients) based on difficulty
  const colorFront = (d:number) => {
    switch(d) {
      case 1: return '#0d9488';
      case 2: return '#2563eb';
      case 3: return '#f59e0b';
      case 4: return '#f97316';
      case 5: return '#dc2626';
      default: return '#64748b';
    }
  };
  const colorBack = (d:number) => {
    switch(d) {
      case 1: return '#0f766e';
      case 2: return '#1e3a8a';
      case 3: return '#b45309';
      case 4: return '#c2410c';
      case 5: return '#7f1d1d';
      default: return '#475569';
    }
  };

  return (
    <div className="scroll-stack-practice" ref={wrapperRef} tabIndex={0}>
      <div className="stack-region">
        {showPrevOverlay && prevCard && direction==='up' && (
          <div className="ss-card moving-from-up" style={{ zIndex: 200, background: colorFront(prevCard.stats?.difficulty || 3) }}>
            <CardFace card={prevCard} diffColor={diffColor} back={false} flipped={false} />
          </div>
        )}
        {windowCards.map((c, i) => {
          const isTop = i === 0;
            const baseOffset = i * CARD_PEN_OFFSET;
            let translate = `translate(${baseOffset}px, ${baseOffset}px)`;
            if (isTop && direction==='down') translate = `translate(0px, -${CARD_SWITCH_RANGE}%)`;
          const diff = c.stats?.difficulty || 3;
          return (
            <div
              key={c._id}
              className={['ss-card', `diff-d${diff}`, isTop ? 'top' : '', isTop && flipped ? 'flipped' : '', direction ? `anim-${direction}` : ''].filter(Boolean).join(' ')}
              style={{ zIndex: 100 - i, transform: translate }}
              onClick={() => isTop && !isMoving && doFlip()}
            >
              <div className="inner">
        <div className="face front" style={{ background: colorFront(diff) }}>
                  <div className="card-depth">
          <CardFace card={c} diffColor={diffColor} back={false} flipped={flipped} />
                  </div>
                  {isTop && !flipped && <div className="hint">Çevir: Space/Tık - Aşağı/Yukarı: Kart - Sağ/Sol: Cevap</div>}
                </div>
        <div className="face back" style={{ background: colorBack(diff) }}>
                  <div className="card-depth">
          <CardFace card={c} diffColor={diffColor} back flipped={flipped} />
                  </div>
                  {isTop && flipped && (
                    <Space className="answer-actions">
                      <Button type="primary" size="small" icon={<CheckOutlined />} onClick={()=>answer(true)}>Bildim</Button>
                      <Button danger size="small" icon={<CloseOutlined />} onClick={()=>answer(false)}>Bilemedim</Button>
                      <Button size="small" icon={<EyeOutlined />} onClick={doFlip}>Çevir</Button>
                    </Space>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="progress">{index + 1} / {cards.length}</div>
    </div>
  );
};

interface CardFaceProps { card: Flashcard; diffColor:(d:number)=>string; back:boolean; flipped:boolean; }
const CardFace: React.FC<CardFaceProps> = ({ card, diffColor, back }) => {
  return (
    <div className="card-face-content">
      <div className="meta">
        <Tag color="purple">{card.topic}</Tag>
        <Tag color={diffColor(card.stats?.difficulty || 3)}>Z{card.stats?.difficulty || 3}</Tag>
        <Tag color='gold'>{card.successRate ?? 0}%</Tag>
      </div>
      <div className="body markdown">
        <ReactMarkdown>{back? card.answer : card.question}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ScrollStackPractice;
