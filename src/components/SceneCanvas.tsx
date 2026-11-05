'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoomScene, type RoomScene } from '@/scene/roomScene';

/** Mounts the 3D room behind the UI. Must sit inside a positioned, sized parent (.app). */
export default function SceneCanvas({ onReady }: { onReady: (scene: RoomScene | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    const root = c.parentElement!;
    // The top bar and the panel float over the room. The scene frames itself in the space they leave.
    const insets = () => {
      const r = root.getBoundingClientRect();
      const top = root.querySelector('.top')?.getBoundingClientRect();
      const panel = root.querySelector('.panel')?.getBoundingClientRect();
      return { top: top ? top.bottom - r.top : 0, bottom: panel ? r.bottom - panel.top : 0 };
    };
    const scene = createRoomScene({ root, canvas: c, labels: labels.current!, bubble: bubble.current!, insets });
    if (!scene) { setFailed(true); return; }
    const ro = new ResizeObserver(() => scene.refit());
    root.querySelectorAll('.top, .panel').forEach((el) => ro.observe(el));
    onReady(scene);
    return () => { ro.disconnect(); onReady(null); scene.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={canvas} className="scene" aria-label="Christmas living room with Santa, a fireplace, a tree, and guests sitting on the rug" />
      <div ref={labels} className="labels" />
      <div ref={bubble} className="bubble" />
      {failed && <p className="fallback">Your browser could not draw the 3D room. Everything else still works.</p>}
    </>
  );
}
