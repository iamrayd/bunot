'use client';

import { useState } from 'react';
import IdentityFields from '@/components/IdentityFields';
import { api, type Identity } from '@/lib/client';
import { SWEATERS, type RoomView } from '@/lib/types';

/** Sit down as a new guest, or return to a seat with the same name and PIN. */
export default function JoinPanel({ code, view, onJoined }: { code: string; view: RoomView; onJoined: (token: string, view: RoomView) => void }) {
  const [who, setWho] = useState<Identity>({ name: '', pin: '', sweater: SWEATERS[1] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!who.name.trim()) { setError('Type your name so Santa knows who you are.'); return; }
    if (!/^\d{4}$/.test(who.pin)) { setError('Your PIN needs exactly 4 digits.'); return; }
    setBusy(true); setError('');
    try {
      const { token, view: v } = await api.join(code, who);
      onJoined(token, v);
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1>{view.locked ? 'Welcome back' : 'Take a seat by the fire'}</h1>
      <p>{view.locked
        ? `${view.name} is locked. If you already joined, enter the same name and PIN to return to your seat.`
        : `Join ${view.name}. Already joined? The same name and PIN bring you back to your seat.`}</p>
      <IdentityFields idPrefix="join" value={who} onChange={setWho} />
      <p className="error" role="alert">{error}</p>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Finding your seat…' : view.locked ? 'Return to my seat' : 'Sit down'}</button>
      <p className="note">Choose a PIN you will remember. Your name and PIN open your seat and your result on any phone.</p>
    </form>
  );
}
