'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMusicMuted, saveMusicMuted, loadMusicVolume, saveMusicVolume } from '@/lib/client';

const PLAYLIST = ['/music/merry-christmas.mp3'];

/** Top-bar button that plays looping background music. Includes a volume slider popover. */
export default function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [muted, setMutedState] = useState(true);
  const [volume, setVolumeState] = useState(0.4);
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Initialise once: restore prefs and wire up the audio element.
  useEffect(() => {
    const el = new Audio(PLAYLIST[0]);
    el.loop = true;
    el.preload = 'none';

    const savedMuted = loadMusicMuted();
    const savedVol = loadMusicVolume();
    el.volume = savedVol;
    setVolumeState(savedVol);
    setMutedState(savedMuted);
    audio.current = el;

    // Autoplay on first user interaction (browsers block autoplay until then).
    function tryStart() {
      if (!savedMuted && !started) {
        el.play().catch(() => {});
        setStarted(true);
      }
    }
    window.addEventListener('pointerdown', tryStart, { once: true });
    window.addEventListener('keydown', tryStart, { once: true });

    return () => {
      window.removeEventListener('pointerdown', tryStart);
      window.removeEventListener('keydown', tryStart);
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the volume popover when clicking outside.
  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    const next = !muted;
    setMutedState(next);
    saveMusicMuted(next);
    if (next) {
      el.pause();
    } else {
      el.play().catch(() => {});
      setStarted(true);
    }
  }

  function onVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolumeState(v);
    saveMusicVolume(v);
    if (audio.current) audio.current.volume = v;
    // If the user cranks the volume up while muted, unmute.
    if (muted && v > 0) {
      setMutedState(false);
      saveMusicMuted(false);
      audio.current?.play().catch(() => {});
      setStarted(true);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        className="chip icon"
        aria-pressed={!muted}
        aria-label="Background music"
        title={muted ? 'Music is off' : 'Music is on'}
        onClick={() => { toggle(); setOpen((o) => !o); }}
        style={{ position: 'relative' }}
      >
        {/* Musical note icon */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
          <path d="M9 18V7l11-2v3L11 10v8a3 3 0 1 1-2-2.83V18zm0 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm11-9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        </svg>
        {muted && (
          <svg
            viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ position: 'absolute', bottom: 3, right: 3 }}
          >
            <path d="M4 4l16 16M4 20L20 4" />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Music volume"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 20,
            background: 'var(--glass)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,243,220,.18)',
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,.55)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
            🎵 Music volume
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* low-vol icon */}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style={{ opacity: .7, flexShrink: 0 }}>
              <path d="M4 9.5h3l5-4v13l-5-4H4z" />
              <path d="M16 9a4.5 4.5 0 0 1 0 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <input
              id="music-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={onVolume}
              aria-label="Music volume"
              style={{
                flex: 1,
                accentColor: 'var(--gold)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cream)', opacity: .8, minWidth: 28, textAlign: 'right' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
