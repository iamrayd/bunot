'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SceneCanvas from '@/components/SceneCanvas';
import IdentityFields from '@/components/IdentityFields';
import SoundToggle from '@/components/SoundToggle';
import { api, cleanCode, saveToken, type Identity } from '@/lib/client';
import { SWEATERS } from '@/lib/types';

type Tab = 'create' | 'join';

export default function Landing() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('create');
  const [who, setWho] = useState<Identity>({ name: '', pin: '', sweater: SWEATERS[1] });
  const [roomName, setRoomName] = useState('');
  const [exchangeDate, setExchangeDate] = useState('');
  const [budget, setBudget] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function show(next: Tab) { setTab(next); setError(''); }
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next: Tab = tab === 'create' ? 'join' : 'create';
    show(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!roomName.trim()) { setError('Give the room a name, like "Reyes family Christmas".'); return; }
    if (!who.name.trim()) { setError('Type your name so Santa knows who you are.'); return; }
    if (!/^\d{4}$/.test(who.pin)) { setError('Your PIN needs exactly 4 digits.'); return; }
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
        <div className="brand"><b>Bunot</b><span>manito, manita</span></div>
        <SoundToggle />
      </header>
      <section className="panel">
        <h1>Gift exchange by the fire</h1>
        <p>Gather the family in Santa&apos;s living room. Everyone draws one rolled paper from the jar, and nobody else sees the name.</p>
        <div className="tabs" role="tablist" aria-label="Start or join" onKeyDown={onTabKey}>
          <button type="button" role="tab" id="tab-create" aria-controls="pane-create" aria-selected={tab === 'create'} tabIndex={tab === 'create' ? 0 : -1} onClick={() => show('create')}>Start a room</button>
          <button type="button" role="tab" id="tab-join" aria-controls="pane-join" aria-selected={tab === 'join'} tabIndex={tab === 'join' ? 0 : -1} onClick={() => show('join')}>Join a room</button>
        </div>
        {tab === 'create' ? (
          <form id="pane-create" role="tabpanel" aria-labelledby="tab-create" onSubmit={create} noValidate>
            <div className="field">
              <label htmlFor="room-name">Room name</label>
              <input id="room-name" type="text" maxLength={40} placeholder="e.g. Reyes family Christmas" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="room-date">Exchange date <span className="opt">optional</span></label>
                <input id="room-date" type="date" value={exchangeDate} onChange={(e) => setExchangeDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="room-budget">Budget <span className="opt">optional</span></label>
                <input id="room-budget" type="text" maxLength={20} placeholder="e.g. ₱300" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
            </div>
            <IdentityFields idPrefix="create" value={who} onChange={setWho} />
            <p className="error" role="alert">{error}</p>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Opening the room…' : 'Start the room'}</button>
            <p className="note">You host this room and also join the exchange. Your name and PIN open your seat on any phone.</p>
          </form>
        ) : (
          <form id="pane-join" role="tabpanel" aria-labelledby="tab-join" onSubmit={join} noValidate>
            <div className="field">
              <label htmlFor="join-code">Room code</label>
              <input id="join-code" className="code" type="text" maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC123"
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
