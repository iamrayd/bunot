'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SceneCanvas from '@/components/SceneCanvas';
import IdentityFields from '@/components/IdentityFields';
import { api, cleanCode, saveToken, type Identity } from '@/lib/client';
import { SWEATERS } from '@/lib/types';

export default function Landing() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [who, setWho] = useState<Identity>({ name: '', pin: '', sweater: SWEATERS[1] });
  const [roomName, setRoomName] = useState('');
  const [exchangeDate, setExchangeDate] = useState('');
  const [budget, setBudget] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { token, view } = await api.create({ ...who, roomName, exchangeDate, budget });
      saveToken(view.code, token);
      router.push(`/r/${view.code}`);
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }
  function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('A room code has 6 letters and numbers.'); return; }
    router.push(`/r/${code}`);
  }

  return (
    <main className="app">
      <SceneCanvas onReady={(s) => s?.say('Ho ho ho! Welcome.', 4)} />
      <header className="top">
        <div className="brand"><b>Bunot</b><span>Manito · Manita</span></div>
      </header>
      <section className="panel">
        <h1>Gift exchange by the fire</h1>
        <p>Gather your group in Santa&apos;s living room. Each guest draws one rolled paper from the jar.</p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'create'} onClick={() => { setTab('create'); setError(''); }}>Start a room</button>
          <button type="button" role="tab" aria-selected={tab === 'join'} onClick={() => { setTab('join'); setError(''); }}>Join a room</button>
        </div>
        {tab === 'create' ? (
          <form onSubmit={create} noValidate>
            <div className="field">
              <label htmlFor="room-name">Room name</label>
              <input id="room-name" type="text" maxLength={40} placeholder="e.g. Team Christmas party" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="room-date">Exchange date</label>
                <input id="room-date" type="date" value={exchangeDate} onChange={(e) => setExchangeDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="room-budget">Budget</label>
                <input id="room-budget" type="text" maxLength={20} placeholder="e.g. ₱300" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>
            <IdentityFields idPrefix="create" value={who} onChange={setWho} />
            <p className="error" role="alert">{error}</p>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Opening the room…' : 'Start the room'}</button>
            <p className="note">You host this room and also join the exchange. Your PIN opens your seat again on any device.</p>
          </form>
        ) : (
          <form onSubmit={join} noValidate>
            <div className="field">
              <label htmlFor="join-code">Room code</label>
              <input id="join-code" className="code" type="text" maxLength={6} autoComplete="off" autoCapitalize="characters" placeholder="ABC123"
                value={code} onChange={(e) => setCode(cleanCode(e.target.value))} />
            </div>
            <p className="error" role="alert">{error}</p>
            <button className="btn" type="submit">Go to the room</button>
            <p className="note">Ask your host for the 6-character code, or open the link they sent.</p>
          </form>
        )}
      </section>
    </main>
  );
}
