'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMusicMuted, saveMusicMuted, loadMusicVolume, saveMusicVolume } from '@/lib/client';

const PLAYLIST = [
  { src: '/music/merry-christmas.mp3',   label: 'Merry Christmas' },
  { src: '/music/merry-christmas-2.mp3', label: 'Merry Christmas II' },
  { src: '/music/merry-christmas-3.mp3', label: 'Merry Christmas III' },
];

/** Fisher-Yates shuffle — returns a new shuffled array, never mutates the original. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Top-bar music player: autoplay on first interaction, looping playlist,
 * prev/next track, and a hover-activated volume slider.
 */
export default function MusicPlayer() {
  const audio        = useRef<HTMLAudioElement | null>(null);
  const unlocked     = useRef(false);
  const wrapRef      = useRef<HTMLDivElement>(null);

  // Shuffle once on mount so every visit plays a different order.
  const [queue]     = useState(() => shuffle(PLAYLIST));
  const [trackIdx,  setTrackIdx]  = useState(0);
  const [muted,     setMutedState] = useState(true);   // starts muted until first interaction
  const [volume,    setVolumeState] = useState(0.4);
  const [hovering,  setHovering]  = useState(false);
  // Initial label comes from the same shuffled queue[0] — set in the boot useEffect below.
  const [songLabel, setSongLabel] = useState('');

  /* ── boot: restore prefs, wire audio element ── */
  useEffect(() => {
    const savedMuted = loadMusicMuted();
    const savedVol   = loadMusicVolume();
    setVolumeState(savedVol);
    setMutedState(savedMuted);

    const el = new Audio(queue[0].src);
    el.loop    = false;
    el.preload = 'auto';
    el.volume  = savedVol;
    // Start muted so the browser allows autoplay immediately.
    // We unmute on the first user interaction below.
    el.muted   = true;
    audio.current = el;
    setSongLabel(queue[0].label);

    el.addEventListener('ended', () => {
      setTrackIdx((i) => (i + 1) % queue.length);
    });

    // Begin playback right away (muted autoplay is universally allowed).
    // If the user had music off last time, keep it paused.
    if (!savedMuted) {
      el.play().catch(() => {});
    }

    // On the first real interaction, unmute so the music is audible.
    function unmute() {
      if (unlocked.current) return;
      unlocked.current = true;
      if (!loadMusicMuted()) {
        el.muted = false;
        setMutedState(false);
      }
    }
    window.addEventListener('pointerdown', unmute);
    window.addEventListener('keydown',     unmute);

    return () => {
      window.removeEventListener('pointerdown', unmute);
      window.removeEventListener('keydown',     unmute);
      el.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* ── track changes: swap src and keep playing if not muted ── */
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.pause();
    el.src = queue[trackIdx].src;
    el.load();
    setSongLabel(queue[trackIdx].label);
    if (!muted) {
      el.muted = false;
      el.play().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx, queue]);

  /* ── helpers ── */
  function goNext() {
    setTrackIdx((i) => (i + 1) % queue.length);
  }
  function goPrev() {
    setTrackIdx((i) => (i - 1 + queue.length) % queue.length);
  }

  const toggleMute = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    const next = !muted;
    setMutedState(next);
    saveMusicMuted(next);
    if (next) {
      el.pause();
    } else {
      unlocked.current = true;
      el.muted = false;
      el.play().catch(() => {});
    }
  }, [muted]);

  function onVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolumeState(v);
    saveMusicVolume(v);
    if (audio.current) audio.current.volume = v;
    if (muted && v > 0) {
      setMutedState(false);
      saveMusicMuted(false);
      unlocked.current = true;
      audio.current?.play().catch(() => {});
    }
  }

  /* ── render ── */
  const popupVisible = hovering;

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* ── main toggle button ── */}
      <button
        type="button"
        className="chip icon"
        aria-pressed={!muted}
        aria-label="Background music"
        title={muted ? 'Music off — click to play' : songLabel}
        onClick={toggleMute}
        style={{ position: 'relative' }}
      >
        {/* Musical note SVG */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
          <path d="M9 18V7l11-2v3L11 10v8a3 3 0 1 1-2-2.83V18zm0 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm11-9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        </svg>
        {/* Muted X badge */}
        {muted && (
          <svg
            viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" fill="none"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            style={{ position: 'absolute', bottom: 3, right: 3 }}
          >
            <path d="M4 4l16 16M4 20L20 4" />
          </svg>
        )}
      </button>

      {/* ── hover popover: song label + prev/next + volume ── */}
      <div
        role="region"
        aria-label="Music controls"
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 20,
          background: 'var(--glass)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,243,220,.18)',
          borderRadius: 16,
          padding: '12px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minWidth: 196,
          boxShadow: '0 10px 30px rgba(0,0,0,.6)',
          pointerEvents: popupVisible ? 'auto' : 'none',
          opacity: popupVisible ? 1 : 0,
          transform: popupVisible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(.97)',
          transition: 'opacity .18s ease, transform .18s ease',
        }}
      >
        {/* Song title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--gold)', opacity: .8, flexShrink: 0 }}>♪</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: 'var(--cream)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {songLabel}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,243,220,.45)', flexShrink: 0 }}>
            {trackIdx + 1}/{queue.length}
          </span>
        </div>

        {/* Prev / Play-Pause / Next */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {/* Prev */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous track"
            title="Previous track"
            style={iconBtnStyle}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Play' : 'Pause'}
            title={muted ? 'Play' : 'Pause'}
            style={{ ...iconBtnStyle, width: 36, height: 36, background: 'var(--gold)', color: 'var(--ink)', borderRadius: '50%' }}
          >
            {muted
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
            }
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Next track"
            title="Next track"
            style={iconBtnStyle}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true" style={{ opacity: .6, flexShrink: 0 }}>
            <path d="M3 9v6h4l5 5V4L7 9H3zm10.5 3A4.5 4.5 0 0 0 11 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
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
            style={{ flex: 1, accentColor: 'var(--gold)', cursor: 'pointer', height: 4 }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cream)', opacity: .7, minWidth: 28, textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  border: 'none',
  borderRadius: '50%',
  background: 'rgba(255,243,220,.12)',
  color: 'var(--cream)',
  cursor: 'pointer',
  transition: 'background .15s',
};
