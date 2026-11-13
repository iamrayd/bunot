'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { copyText } from '@/lib/client';
import { useDialog } from '@/lib/useDialog';

/** One SVG path for the whole code. Dark squares on a light ground, with the 4-square quiet margin scanners need. */
function qrPath(text: string) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, n };
}

function QrDialog({ link, code, onClose }: { link: string; code: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const { d, n } = useMemo(() => qrPath(link), [link]);
  useDialog(root, onClose);
  useEffect(() => { close.current?.focus(); }, []);

  return (
    <div ref={root} className="overlay" role="dialog" aria-modal="true" aria-label="Scan to join">
      <div className="jarwrap">
        <h2>Scan to join</h2>
        <p>Point a phone camera at the square.</p>
        <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} role="img" aria-label={`QR code for ${link}`} shapeRendering="crispEdges">
          <rect x="-4" y="-4" width={n + 8} height={n + 8} fill="#fffaf0" />
          <path d={d} fill="#2a1418" />
        </svg>
        <p className="bigcode">Room code <b>{code}</b></p>
        <button ref={close} type="button" className="btn big" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/** Ways to bring relatives into the room: copy the link, the phone's share sheet, or a QR code to scan. */
export default function SharePanel({ link, code, roomName }: { link: string; code: string; roomName: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [qr, setQr] = useState(false);
  const closeQr = useCallback(() => setQr(false), []);

  useEffect(() => { setCanShare(typeof navigator.share === 'function'); }, []);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  async function share() {
    try { await navigator.share({ title: 'Bunot', text: `Join ${roomName} and draw your manito or manita.`, url: link }); } catch { /* closed the share sheet */ }
  }

  return (
    <div className="share">
      <code>{link.replace(/^https?:\/\//, '')}</code>
      <div className="btns">
        <button className="btn ghost" type="button" onClick={async () => setCopied(await copyText(link))}>{copied ? 'Link copied' : 'Copy link'}</button>
        {canShare && <button className="btn ghost" type="button" onClick={share}>Share</button>}
        <button className="btn ghost" type="button" onClick={() => setQr(true)}>Show QR code</button>
      </div>
      {qr && link && <QrDialog link={link} code={code} onClose={closeQr} />}
    </div>
  );
}
