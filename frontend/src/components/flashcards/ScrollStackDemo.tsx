import React, { useEffect, useRef } from 'react';
import './ScrollStackDemo.scss';

/**
 * ScrollStackDemo
 * React adaptation of the provided vanilla JS stacked card scroll / arrow key demo.
 * Purely visual: shows 5 stacked colored cards you can cycle with mouse wheel or Arrow Up/Down.
 * (Not wired into flashcard practice answering logic yet.)
 */
const COLORS = ['first','second','third','fourth','fifth'];

const ScrollStackDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const isMovingRef = useRef(false);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const offsetArrayRef = useRef<number[]>([]);

  // constants (tunable via CSS custom props maybe later)
  const CARD_PEN_OFFSET = 10; // displacement of the cards
  const CARD_SWITCH_RANGE = '130%';

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean);
    if (!cards.length) return;
    lastElementRef.current = cards[cards.length - 1];
    // build offset array
    const arr: number[] = []; let offset = 0;
    for (let i = 1; i <= cards.length; i++) { arr.push(offset); offset += CARD_PEN_OFFSET; }
    offsetArrayRef.current = arr;
    setCardOffset();
  }, []);

  const setCardOffset = () => {
    const cards = cardRefs.current.filter(Boolean);
    const count = cards.length;
    cards.forEach((item, index) => {
      item.style.zIndex = String(Math.abs(index - count));
      const off = offsetArrayRef.current[index] || 0;
      item.style.transform = `translate(${off}px, ${off}px)`;
    });
  };

  useEffect(() => {
    const onWheel = (e: WheelEvent) => cardSwitching(e);
    const onKey = (e: KeyboardEvent) => cardSwitching(e);
    const root = containerRef.current;
    if (!root) return;
    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('keydown', onKey); // container is focusable
    return () => { root.removeEventListener('wheel', onWheel); root.removeEventListener('keydown', onKey); };
  }, []);

  const cardSwitching = (e: WheelEvent | KeyboardEvent) => {
    const cards = cardRefs.current.filter(Boolean);
    const count = cards.length;
    if (isMovingRef.current || !count) return;
    const isKey = (e as KeyboardEvent).key !== undefined;
    const key = (e as KeyboardEvent).key;
    if (isKey && key !== 'ArrowUp' && key !== 'ArrowDown') return;

    let animationObject: HTMLDivElement | undefined; let previousSibling: Element | null = null; let scrolling: 'up' | 'down' | '' = '';
    for (let card of cards) {
      const z = parseInt(window.getComputedStyle(card).zIndex || '0', 10);
      if (z === count) {
        if ((e as WheelEvent).deltaY < 0 || key === 'ArrowUp') {
          previousSibling = card.previousElementSibling;
          if (!previousSibling) previousSibling = lastElementRef.current;
        }
        animationObject = ((e as WheelEvent).deltaY < 0 || key === 'ArrowUp') ? previousSibling as HTMLDivElement : ((e as WheelEvent).deltaY > 0 || key === 'ArrowDown') ? card : undefined;
        if (!animationObject) return;
        animationObject.style.transform = `translate(0px, -${CARD_SWITCH_RANGE})`;
        scrolling = ((e as WheelEvent).deltaY < 0 || key === 'ArrowUp') ? 'up' : ((e as WheelEvent).deltaY > 0 || key === 'ArrowDown') ? 'down' : '';
        isMovingRef.current = true;
      }
    }
    if (animationObject) {
      animationObject.addEventListener('transitionend', function handler(){
        animationObject.removeEventListener('transitionend', handler);
        if (scrolling === 'down') {
          animationObject.style.zIndex = '0';
          const off = offsetArrayRef.current[cards.length] || 0;
          animationObject.style.transform = `translate(${off}px, ${off}px)`;
          offsetSwitch(scrolling);
        } else if (scrolling === 'up') {
          offsetSwitch(scrolling);
          animationObject.style.zIndex = String(cards.length);
          animationObject.style.transform = 'translate(0px, 0px)';
        }
      }, { once: true });
    }
  };

  const offsetSwitch = (scrolling: 'up' | 'down') => {
    const cards = cardRefs.current.filter(Boolean);
    const count = cards.length;
    cards.forEach(card => {
      const newZ = scrolling === 'down' ? (parseInt(card.style.zIndex || '0', 10) + 1) : (parseInt(card.style.zIndex || '0', 10) - 1);
      card.style.zIndex = String(newZ);
      const offsetIndex = Math.abs(newZ - count);
      const off = offsetArrayRef.current[offsetIndex] || 0;
      card.style.transform = `translate(${off}px, ${off}px)`;
      card.addEventListener('transitionend', () => { isMovingRef.current = false; }, { once: true });
    });
  };

  return (
    <div className="scroll-stack-demo" ref={containerRef} tabIndex={0}>
      <div className="demo-instructions">Scroll veya Yukarı/Aşağı tuşları ile kartları döngüsel kaydır.</div>
      <div className="cards-layer">
        {COLORS.map((c, i) => (
          <div
            key={c}
            className={`sc-card ${c}`}
            ref={el => { if (el) cardRefs.current[i] = el; }}
          >
            {c === 'first' && (
              <div className="inner-text">
                <p>Scroll veya UP / DOWN</p>
                <p>(Dokunmatik için henüz yok)</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrollStackDemo;
