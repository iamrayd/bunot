'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sound';
import { useDialog } from '@/lib/useDialog';

export type Drawn = { name: string; wish: string };

type Props = {
  /** How many rolled papers are in the jar when it opens. */
  count: number;
  /** Called when the guest taps a paper. Resolves to the drawn guest. */
  onChoose: () => Promise<Drawn>;
  /** Called when the guest has read the name and closes the jar. */
  onDone: () => void;
  onCancel: () => void;
};

function layout(count: number) {
  const n = Math.max(1, count);
  const cols = n <= 9 ? 3 : n <= 20 ? 4 : 5;
  const scale = cols === 3 ? 1 : cols === 4 ? 0.8 : 0.66;
  const rowStep = cols === 3 ? 13 : cols === 4 ? 11 : 9.5;
  return Array.from({ length: n }, (_, i) => ({
    left: 7 + (i % cols) * (84 / cols) + Math.random() * (cols === 3 ? 8 : 4),
    top: 81 - Math.floor(i / cols) * rowStep + Math.random() * 3,
    rot: Math.round(Math.random() * 50 - 25),
    scale,
  }));
}

/** Full-screen jar. The guest taps one rolled paper; it rises and unrolls to show a name. */
export default function JarPicker({ count, onChoose, onDone, onCancel }: Props) {
  // The papers are laid out once. The room keeps changing while the jar is open, and papers must not jump.
  const [papers] = useState(() => layout(count));
  const [chosen, setChosen] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const done = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; first.current?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => { if (drawn) done.current?.focus(); }, [drawn]);

  // Escape closes the jar: before a tap it cancels, after the name shows it finishes. Never mid-draw.
  const onEscape = useCallback(() => {
    if (drawn) onDone();
    else if (chosen === null) onCancel();
  }, [chosen, drawn, onCancel, onDone]);
  useDialog(root, onEscape);

  async function choose(i: number) {
    if (chosen !== null) return;
    setChosen(i); setError('');
    play.paper();
    try {
      const [result] = await Promise.all([onChoose(), new Promise((r) => setTimeout(r, 750))]);
      if (!alive.current) return;
      setDrawn(result);
      play.reveal();
    } catch (e) {
      if (!alive.current) return;
      setError((e as Error).message);
      setChosen(null);
    }
  }

  return (
    <div ref={root} className="overlay" role="dialog" aria-modal="true" aria-label="Santa's jar">
      <div className="jarwrap">
        <h2>Santa&apos;s jar</h2>
        <p className={error ? 'oops' : undefined} aria-live="polite">
          {error || (chosen === null ? 'Tap one rolled paper.' : drawn ? 'Only you should see this.' : 'Unrolling…')}
        </p>
        <div className={'slip' + (drawn ? ' open' : '')} aria-live="polite">
          <small>Your manito / manita is</small>
          <strong>{drawn?.name || ' '}</strong>
          {drawn?.wish && <em>Wish: {drawn.wish}</em>}
        </div>
        <div className={'jar' + (chosen !== null ? ' chosen' : '')}>
          {papers.map((p, i) => (
            <button key={i} ref={i === 0 ? first : undefined} type="button" aria-label={`Rolled paper ${i + 1}`} disabled={chosen !== null}
              className={'scroll' + (chosen === i ? ' out' : '') + (chosen === i && drawn ? ' gone' : '')}
              style={{ left: `${p.left}%`, top: `${p.top}%`, ['--r' as string]: `${p.rot}deg`, ['--s' as string]: p.scale }}
              onClick={() => choose(i)} />
          ))}
        </div>
        {drawn
          ? <button ref={done} type="button" className="btn big" onClick={onDone}>Got it, keep it secret</button>
          : chosen === null && <button type="button" className="btn ghost onDark" onClick={onCancel}>Not yet</button>}
      </div>
    </div>
  );
}
