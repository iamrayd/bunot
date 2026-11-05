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
    const scene = createRoomScene({ root: c.parentElement!, canvas: c, labels: labels.current!, bubble: bubble.current! });
    if (!scene) { setFailed(true); return; }
    onReady(scene);
    return () => { onReady(null); scene.dispose(); };
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
