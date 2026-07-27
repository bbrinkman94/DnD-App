/** A custom cursor: a silver ring that opens over anything Corvin can use. */

import { useEffect, useRef, useState } from 'react';

export function Cursor(): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return;
    document.documentElement.dataset.cursor = 'custom';
    setVisible(true);

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const move = (event: PointerEvent): void => {
      x = event.clientX;
      y = event.clientY;
      const target = event.target as HTMLElement | null;
      setActive(!!target?.closest('button, a, [role="button"], input, select'));
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px)`;
        });
      }
    };

    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointermove', move);
      delete document.documentElement.dataset.cursor;
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  return (
    <div ref={ref} className="cursor" data-active={active} aria-hidden="true">
      <div className="cursor__ring" />
      <div className="cursor__dot" />
    </div>
  );
}
