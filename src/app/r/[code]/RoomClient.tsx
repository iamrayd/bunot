'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import SceneCanvas from '@/components/SceneCanvas';
import IdentityFields from '@/components/IdentityFields';
import JarPicker from '@/components/JarPicker';
import { api, ApiError, loadToken, saveToken, type Identity } from '@/lib/client';
import { MIN_GUESTS, SWEATERS, type RoomView } from '@/lib/types';
import type { RoomScene } from '@/scene/roomScene';

const POLL_MS = 4000;

function niceDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function RoomClient({ code }: { code: string }) {
  const [scene, setScene] = useState<RoomScene | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [missing, setMissing] = useState('');
  const [picking, setPicking] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  const [hideTag, setHideTag] = useState(false);
  const token = useRef<string | null>(null);
  const prev = useRef<RoomView | null>(null);
  const pendingView = useRef<RoomView | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { view: v } = await api.view(code, token.current);
      setView(v); setMissing('');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 503)) setMissing(e.message);
    }
  }, [code]);

  // First load, then poll while the tab is visible.
  useEffect(() => {
    token.current = loadToken(code);
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    const onShow = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onShow); };
  }, [code, refresh]);

  // Instant updates when Supabase Realtime is configured. Polling above is the fallback.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    let stop = () => {};
    let cancelled = false;
    import('@supabase/supabase-js').then(({ createClient }) => {
      if (cancelled) return;
      const client = createClient(url, anon, { auth: { persistSession: false } });
      const channel = client.channel(`room:${code}`).on('broadcast', { event: 'changed' }, () => refresh()).subscribe();
      stop = () => { client.removeChannel(channel); };
    }).catch(() => {});
    return () => { cancelled = true; stop(); };
  }, [code, refresh]);

  // Push the view into the 3D room and animate what changed since last time.
  useEffect(() => {
    if (!scene || !view) return;
    const meId = view.me?.id ?? null;
    scene.setGuests(view.guests, meId);
    const before = prev.current;
    if (before && before !== view) {
      for (const g of view.guests) {
        if (g.id === meId) continue;
        const was = before.guests.find((x) => x.id === g.id);
        if (!was) scene.say(`Welcome, ${g.name}!`, 2.2);
        else if (!was.hasPicked && g.hasPicked) { scene.flyPaper(g.id); scene.say('Ho ho ho!', 1.8); }
      }
      if (!before.locked && view.locked) scene.say('The jar is open!', 2.5);
    }
    prev.current = view;
    scene.setStar(hideTag || picking ? null : view.me?.pickId ?? null);
  }, [scene, view, hideTag, picking]);

  const me = view?.me ?? null;

  function openJar() {
    setPicking(true);
    scene?.setJarRaised(true);
    scene?.say('Pick one!', 1.2);
  }
  function closeJar() {
    setPicking(false);
    scene?.setJarRaised(false);
  }
  async function drawPaper() {
    const { view: v } = await api.act(code, token.current, { type: 'pick' });
    pendingView.current = v;
    return v.me?.pickName ?? '';
  }
  function afterDraw() {
    const v = pendingView.current;
    closeJar();
    if (v?.me) {
      scene?.flyPaper(v.me.id);
      scene?.burst(v.me.id);
      scene?.say('Keep it secret!', 2.4);
      setView(v);
    }
  }

  const title = view?.name ?? '';
  return (
    <main className="app">
      <SceneCanvas onReady={setScene} />
      <header className="top">
        <Link className="brand" href="/"><b>Bunot</b><span>Manito · Manita</span></Link>
        {view && (
          <>
            <div className="chip">Room <code>{view.code}</code> · {view.guests.length} guest{view.guests.length === 1 ? '' : 's'}</div>
            {(view.exchangeDate || view.budget) && (
              <div className="chip">{[view.exchangeDate && `Exchange ${niceDate(view.exchangeDate)}`, view.budget && `Budget ${view.budget}`].filter(Boolean).join(' · ')}</div>
            )}
          </>
        )}
      </header>

      <section className="panel" aria-live="polite">
        {missing ? (
          <>
            <h1>Room not found</h1>
            <p>{missing}</p>
            <Link className="btn" href="/">Back to the start</Link>
          </>
        ) : !view ? (
          <><h1>Opening the door…</h1><p>Finding room {code}.</p></>
        ) : !me ? (
          <JoinPanel code={code} view={view} onJoined={(t, v) => { token.current = t; saveToken(code, t); setView(v); }} />
        ) : hostOpen && me.isHost ? (
          <HostPanel code={code} view={view} token={token.current} onView={setView} onClose={() => setHostOpen(false)} />
        ) : (
          <>
            {!view.locked ? (
              <>
                <h1>You are in, {me.name}</h1>
                <p>{me.isHost
                  ? `This is ${title}. Share the room, then lock it once everyone has sat down. Locking opens Santa's jar.`
                  : `This is ${title}. Get comfy. The host locks the room once everyone has sat down, then Santa opens the jar.`}</p>
              </>
            ) : !me.pickName ? (
              <>
                <h1>Your turn, {me.name}</h1>
                <p>Santa&apos;s jar holds {view.papersLeft} rolled paper{view.papersLeft === 1 ? '' : 's'}. Pick any one. Guests holding a paper have already picked.</p>
                <button className="btn big" type="button" onClick={openJar} disabled={picking}>Pick from the jar</button>
              </>
            ) : (
              <>
                <h1>Santa has spoken</h1>
                <div className={'tag' + (hideTag ? ' hide' : '')}>
                  <small>Your manito / manita is</small>
                  <strong>{me.pickName}</strong>
                  <small>Drawn from Santa&apos;s jar</small>
                </div>
                <p className="note">Only you can see this tag. Keep it secret until the exchange. Your name and PIN open it again on any device.</p>
              </>
            )}
            <div className="btns">
              {me.pickName && <button className="btn" type="button" onClick={() => setHideTag((h) => !h)}>{hideTag ? 'Show tag' : 'Hide tag'}</button>}
              {me.isHost && <button className="btn ghost" type="button" onClick={() => setHostOpen(true)}>Host controls</button>}
            </div>
          </>
        )}
      </section>

      {picking && view && <JarPicker count={view.papersLeft} onChoose={drawPaper} onDone={afterDraw} onCancel={closeJar} />}
    </main>
  );
}

function JoinPanel({ code, view, onJoined }: { code: string; view: RoomView; onJoined: (token: string, view: RoomView) => void }) {
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
        ? `${view.name} is locked. If you already joined, enter your name and PIN to return to your seat.`
        : `Join ${view.name}. Then pick a rolled paper from Santa's jar to find your manito or manita.`}</p>
      <IdentityFields idPrefix="join" value={who} onChange={setWho} />
      <p className="error" role="alert">{error}</p>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Finding a seat…' : view.locked ? 'Return to my seat' : 'Sit down'}</button>
      <p className="note">Pick a PIN you will remember. Your name and PIN open your seat and your result again on any device.</p>
    </form>
  );
}

function HostPanel({ code, view, token, onView, onClose }: { code: string; view: RoomView; token: string | null; onView: (v: RoomView) => void; onClose: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState('');
  const [copied, setCopied] = useState(false);
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/r/${code}`;

  async function act(body: Parameters<typeof api.act>[2]) {
    if (busy) return;
    setBusy(true); setError('');
    try { onView((await api.act(code, token, body)).view); } catch (e) { setError((e as Error).message); }
    setBusy(false); setConfirmRemove('');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the link is selectable below */ }
  }

  const waiting = view.guests.filter((g) => !g.hasPicked).length;
  return (
    <>
      <h1>Host controls</h1>
      <p>{view.locked
        ? waiting ? `${waiting} guest${waiting === 1 ? ' has' : 's have'} not picked yet.` : 'Everyone has picked. Happy gifting!'
        : 'Share this link. Lock the room once everyone has joined.'}</p>
      <div className="share">
        <code>{link}</code>
        <button className="btn ghost" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <ul className="guestlist">
        {view.guests.map((g) => (
          <li key={g.id}>
            <span className="who">{g.name}{g.isHost ? ' (host)' : ''}</span>
            <span className={'pill' + (g.hasPicked ? ' done' : '')}>{g.hasPicked ? 'Picked' : g.pinReset ? 'New PIN pending' : view.locked ? 'Not yet' : 'Seated'}</span>
            {view.locked && !g.hasPicked && !g.isHost && <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'pick', forGuestId: g.id })}>Pick for them</button>}
            {!g.isHost && !g.pinReset && <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'resetPin', guestId: g.id })}>Reset PIN</button>}
            {!view.locked && !g.isHost && (confirmRemove === g.id
              ? <button className="mini" type="button" disabled={busy} onClick={() => act({ type: 'remove', guestId: g.id })}>Yes, remove</button>
              : <button className="mini" type="button" onClick={() => setConfirmRemove(g.id)}>Remove</button>)}
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
      <p className="note">You see who has picked. You never see who picked whom. &quot;Pick for them&quot; draws a paper for a guest; only they can read it.</p>
    </>
  );
}
