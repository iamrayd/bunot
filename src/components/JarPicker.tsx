'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  /** How many rolled papers are in the jar. */
  count: number;
  /** Called when the guest taps a paper. Resolves to the drawn name. */
  onChoose: () => Promise<string>;
  /** Called after the name has been shown. */
  onDone: () => void;
  onCancel: () => void;
};

/** Full-screen jar. The guest taps one rolled paper; it rises and unrolls to show a name. */
export default function JarPicker({ count, onChoose, onDone, onCancel }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const first = useRef<HTMLButtonElement>(null);

  const papers = useMemo(() => {
    const cols = count <= 9 ? 3 : count <= 20 ? 4 : 5;
    const scale = cols === 3 ? 1 : cols === 4 ? 0.8 : 0.66;
    const rowStep = cols === 3 ? 13 : cols === 4 ? 11 : 9.5;
    return Array.from({ length: count }, (_, i) => ({
      left: 7 + (i % cols) * (84 / cols) + Math.random() * (cols === 3 ? 8 : 4),
      top: 81 - Math.floor(i / cols) * rowStep + Math.random() * 3,
      rot: Math.round(Math.random() * 50 - 25),
      scale,
    }));
  }, [count]);

  useEffect(() => { first.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && chosen === null) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chosen, onCancel]);

  async function choose(i: number) {
    if (chosen !== null) return;
    setChosen(i); setError('');
    try {
      const [drawn] = await Promise.all([onChoose(), new Promise((r) => setTimeout(r, 750))]);
      setName(drawn);
      setTimeout(onDone, 2800);
    } catch (e) {
      setError((e as Error).message);
      setChosen(null);
    }
  }

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Santa's jar">
      <div className="jarwrap">
        <h2>Santa&apos;s jar</h2>
        <p aria-live="polite">{error || (chosen === null ? 'Tap one rolled paper.' : name ? 'Keep it secret.' : 'Unrolling…')}</p>
        <div className={'slip' + (name ? ' open' : '')}>
          <small>Your manito / manita is</small>
          <strong>{name || ' '}</strong>
        </div>
        <div className={'jar' + (chosen !== null ? ' chosen' : '')}>
          {papers.map((p, i) => (
            <button key={i} ref={i === 0 ? first : undefined} type="button" aria-label={`Rolled paper ${i + 1}`}
              className={'scroll' + (chosen === i ? ' out' : '') + (chosen === i && name ? ' gone' : '')}
              style={{ left: `${p.left}%`, top: `${p.top}%`, ['--r' as string]: `${p.rot}deg`, ['--s' as string]: p.scale }}
              onClick={() => choose(i)} />
          ))}
        </div>
        {chosen === null && <button type="button" className="btn ghost onDark" onClick={onCancel}>Not yet</button>}
      </div>
    </div>
  );
}
