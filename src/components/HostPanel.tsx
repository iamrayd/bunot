'use client';

import { useState } from 'react';
import SharePanel from '@/components/SharePanel';
import { api } from '@/lib/client';
import { MIN_GUESTS, type RoomView } from '@/lib/types';

type Props = { code: string; link: string; view: RoomView; token: string | null; onView: (v: RoomView) => void; onClose: () => void };

/** The host's guest list: who is seated, who has drawn, and the fixes a host can make. */
export default function HostPanel({ code, link, view, token, onView, onClose }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState('');

  async function act(body: Parameters<typeof api.act>[2]) {
    if (busy) return;
    setBusy(true); setError('');
    try { onView((await api.act(code, token, body)).view); } catch (e) { setError((e as Error).message); }
    setBusy(false); setConfirmRemove('');
  }

  const waiting = view.guests.filter((g) => !g.hasPicked).length;
  return (
    <>
      <h1>Manage guests</h1>
      <p>{view.locked
        ? waiting ? `${waiting} guest${waiting === 1 ? ' has' : 's have'} not drawn yet.` : 'Everyone has drawn. Happy gifting!'
        : 'Lock the room once everyone has sat down.'}</p>
      {!view.locked && <SharePanel link={link} code={code} roomName={view.name} />}
      <ul className="guestlist">
        {view.guests.map((g) => (
          <li key={g.id}>
            <span className="who">{g.name}{g.isHost ? ' (host)' : ''}</span>
            <span className={'pill' + (g.hasPicked ? ' done' : '')}>{g.hasPicked ? 'Drawn' : g.pinReset ? 'New PIN pending' : view.locked ? 'Not yet' : 'Seated'}</span>
            {!g.isHost && (
              <span className="acts">
                {view.locked && !g.hasPicked && <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'pick', forGuestId: g.id })}>Draw for them</button>}
                {!g.pinReset && <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'resetPin', guestId: g.id })}>Reset PIN</button>}
                {!view.locked && (confirmRemove === g.id
                  ? <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'remove', guestId: g.id })}>Yes, remove</button>
                  : <button className="mini" type="button" onClick={() => setConfirmRemove(g.id)}>Remove</button>)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="error" role="alert">{error}</p>
      {!view.locked ? (
        <button className="btn" type="button" disabled={busy || view.guests.length < MIN_GUESTS} onClick={() => act({ type: 'lock' })}>
          {view.guests.length < MIN_GUESTS ? `Need ${MIN_GUESTS} guests to lock` : 'Lock room and open the jar'}
        </button>
      ) : !view.started ? (
        <button className="btn ghost" type="button" disabled={busy} onClick={() => act({ type: 'unlock' })}>Unlock room to let more guests in</button>
      ) : null}
      <div className="btns"><button className="btn ghost" type="button" onClick={onClose}>Back to my seat</button></div>
      <p className="note">You see who has drawn, never who drew whom. &quot;Draw for them&quot; draws a paper for a guest; only they can read it, with their name and PIN.</p>
    </>
  );
}
