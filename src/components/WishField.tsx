'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { MAX_WISH, type RoomView } from '@/lib/types';

/** The guest's own gift hint. Only the guest who draws them reads it. */
export default function WishField({ code, token, value, onView }: { code: string; token: string | null; value: string; onView: (v: RoomView) => void }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Follow a wish changed on another device, unless this one has unsaved typing.
  useEffect(() => {
    if (value === saved) return;
    if (draft === saved) setDraft(value);
    setSaved(value);
  }, [value, saved, draft]);

  const clean = draft.replace(/\s+/g, ' ').trim();
  const dirty = clean !== saved;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !dirty) return;
    setBusy(true); setError('');
    try {
      const { view } = await api.act(code, token, { type: 'setWish', wish: clean });
      const now = view.me?.wish ?? clean;
      setSaved(now); setDraft(now);
      onView(view);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <form className="wish" onSubmit={save} noValidate>
      <label htmlFor="wish">My wish</label>
      <div className="inline">
        <input id="wish" type="text" maxLength={MAX_WISH} autoComplete="off" placeholder="e.g. Cozy socks, size 8" value={draft}
          onChange={(e) => setDraft(e.target.value)} aria-describedby="wish-help" />
        <button className="btn ghost" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save' : saved ? 'Saved' : 'Save'}</button>
      </div>
      <p className={error ? 'error' : 'hint'} id="wish-help" role={error ? 'alert' : undefined}>{error || 'Only the person who draws your name sees this.'}</p>
    </form>
  );
}
