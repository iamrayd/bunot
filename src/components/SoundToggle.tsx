'use client';

import { useEffect, useState } from 'react';
import { loadMuted, saveMuted } from '@/lib/client';
import { play, setMuted, unlockSound } from '@/lib/sound';

/** Top bar button that turns the sound on or off. Also arms the sound on the first tap anywhere. */
export default function SoundToggle() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const saved = loadMuted();
    setMutedState(saved);
    setMuted(saved);
    window.addEventListener('pointerdown', unlockSound);
    window.addEventListener('keydown', unlockSound);
    return () => { window.removeEventListener('pointerdown', unlockSound); window.removeEventListener('keydown', unlockSound); };
  }, []);

  function toggle() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    saveMuted(next);
    if (!next) { unlockSound(); play.sit(); }
  }

  return (
    <button type="button" className="chip icon" onClick={toggle} aria-pressed={!muted} aria-label="Sound" title={muted ? 'Sound is off' : 'Sound is on'}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3l5-4v13l-5-4H4z" fill="currentColor" />
        {muted ? <path d="M16.5 9.5l5 5m0-5l-5 5" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6m2.8-8.5a8.5 8.5 0 0 1 0 11" />}
      </svg>
    </button>
  );
}
