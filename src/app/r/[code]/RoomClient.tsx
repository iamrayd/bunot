'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import SceneCanvas from '@/components/SceneCanvas';
import HostPanel from '@/components/HostPanel';
import JarPicker, { type Drawn } from '@/components/JarPicker';
import JoinPanel from '@/components/JoinPanel';
import ResultTag from '@/components/ResultTag';
import SharePanel from '@/components/SharePanel';
import SoundToggle from '@/components/SoundToggle';
import WishField from '@/components/WishField';
import { api, ApiError, clearToken, copyText, loadToken, saveToken } from '@/lib/client';
import { play } from '@/lib/sound';
import { MIN_GUESTS, type RoomView } from '@/lib/types';
import type { RoomScene } from '@/scene/roomScene';

const POLL_MS = 4000;

/** "Exchange in 12 days, on Dec 24" from a yyyy-mm-dd date. Empty when the date is missing or invalid. */
function exchangeLine(iso: string) {
  const day = new Date(iso + 'T00:00:00');
  if (!iso || Number.isNaN(day.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const nice = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (days > 1) return `Exchange in ${days} days, on ${nice}`;
  if (days === 1) return `Exchange tomorrow, ${nice}`;
  if (days === 0) return 'Exchange today';
  return `Exchange was on ${nice}`;
}

export default function RoomClient({ code }: { code: string }) {
  const [scene, setScene] = useState<RoomScene | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [missing, setMissing] = useState<{ title: string; text: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const token = useRef<string | null>(null);
  const prev = useRef<RoomView | null>(null);
  const pendingView = useRef<RoomView | null>(null);
  const fails = useRef(0);
  /** Counts seat changes on this phone. An answer that was asked for by an earlier seat is dropped. */
  const seat = useRef(0);

  const refresh = useCallback(async () => {
    const asked = token.current;
    try {
      const { view: v } = await api.view(code, asked);
      // The seat changed while this request was in the air (switch person, sign in). Drop the stale answer.
      if (token.current !== asked) return;
      fails.current = 0;
      setView(v); setMissing(null); setOffline(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing({ title: 'Room not found', text: e.message });
      else if (e instanceof ApiError && e.status === 503) setMissing({ title: 'The room is not ready', text: e.message });
      else if (++fails.current >= 2) setOffline(true);
    }
  }, [code]);

  // First load, then poll while the tab is visible. A hidden tab also turns the result tag face down.
  useEffect(() => {
    token.current = loadToken(code);
    setLink(`${window.location.origin}/r/${code}`);
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
    const onShow = () => { if (document.hidden) setRevealed(false); else refresh(); };
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
        if (!was) { scene.say(`Welcome, ${g.name}!`, 2.2); play.sit(); }
        else if (!was.hasPicked && g.hasPicked) { scene.flyPaper(g.id); scene.say('Ho ho ho!', 1.8); play.paper(); }
      }
      if (!before.locked && view.locked) { scene.say('The jar is open!', 2.5); play.open(); }
    }
    prev.current = view;
    // The star floats over the guest I drew. It follows the tag: hidden unless I chose to peek.
    scene.setStar(revealed && !picking ? view.me?.pickId ?? null : null);
  }, [scene, view, revealed, picking]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const me = view?.me ?? null;
  const host = view?.guests.find((g) => g.isHost) ?? null;
  const total = view?.guests.length ?? 0;
  const drawnCount = view?.guests.filter((g) => g.hasPicked).length ?? 0;
  const allDrawn = !!view?.locked && total > 0 && drawnCount === total;
  const details = view ? [exchangeLine(view.exchangeDate), view.budget && `Budget ${view.budget}`].filter(Boolean) as string[] : [];

  const seatNow = seat.current;
  /** For answers to actions started from this render: ignored if the seat changed while they were in the air. */
  const applyView = (v: RoomView) => { if (seat.current === seatNow) setView(v); };

  function seated(t: string, v: RoomView) {
    seat.current += 1;
    token.current = t; saveToken(code, t);
    setRevealed(false); setHostOpen(false); setSwitching(false); setError('');
    setView(v);
  }
  /** Leave this seat on this phone so another relative can use it. The seat itself stays in the room. */
  function switchPerson() {
    seat.current += 1;
    clearToken(code); token.current = null;
    setRevealed(false); setHostOpen(false); setSwitching(false); setError('');
    setView((v) => (v ? { ...v, me: null } : v));
    refresh();
  }
  async function lockRoom() {
    if (busy) return;
    setBusy(true); setError('');
    try { applyView((await api.act(code, token.current, { type: 'lock' })).view); } catch (e) { if (seat.current === seatNow) setError((e as Error).message); }
    setBusy(false);
  }

  function openJar() {
    setPicking(true);
    scene?.setJarRaised(true);
    scene?.say('Pick one!', 1.2);
  }
  const closeJar = useCallback(() => {
    setPicking(false);
    scene?.setJarRaised(false);
    refresh();
  }, [scene, refresh]);
  const drawPaper = useCallback(async (): Promise<Drawn> => {
    const { view: v } = await api.act(code, token.current, { type: 'pick' });
    pendingView.current = v;
    return { name: v.me?.pickName ?? '', wish: v.me?.pickWish ?? '' };
  }, [code]);
  const afterDraw = useCallback(() => {
    const v = pendingView.current;
    pendingView.current = null;
    setPicking(false);
    setRevealed(false);
    scene?.setJarRaised(false);
    if (v?.me && v.me.id === prev.current?.me?.id) {
      scene?.flyPaper(v.me.id);
      scene?.burst(v.me.id);
      scene?.say('Keep it secret!', 2.4);
      setView(v);
    }
  }, [scene]);

  const progress = view?.locked && (
    <div className="progress" role="img" aria-label={`${drawnCount} of ${total} guests have drawn`}>
      <i style={{ width: `${total ? (drawnCount / total) * 100 : 0}%` }} />
      <span>{allDrawn ? 'Everyone has drawn' : `${drawnCount} of ${total} have drawn`}</span>
    </div>
  );

  return (
    <main className="app">
      <SceneCanvas onReady={setScene} />
      <header className="top">
        <Link className="brand" href="/"><b>Bunot</b><span>manito, manita</span></Link>
        {offline && <div className="chip warn" role="status">Reconnecting…</div>}
        {view && (
          <button type="button" className="chip" onClick={async () => setCopied(await copyText(link))} title="Copy the room link">
            {copied ? <span>Link copied</span> : <><span>Room <code>{view.code}</code></span><span className="count">{total} guest{total === 1 ? '' : 's'}</span></>}
          </button>
        )}
        <SoundToggle />
      </header>

      <section className="panel">
        {missing ? (
          <>
            <h1>{missing.title}</h1>
            <p>{missing.text}</p>
            <Link className="btn" href="/">Back to the start</Link>
          </>
        ) : !view ? (
          <><h1>Opening the door…</h1><p>Finding room {code}.</p></>
        ) : !me ? (
          <JoinPanel code={code} view={view} onJoined={seated} />
        ) : hostOpen && me.isHost ? (
          <HostPanel code={code} link={link} view={view} token={token.current} onView={applyView} onClose={() => setHostOpen(false)} />
        ) : switching ? (
          <>
            <h1>Switch person?</h1>
            <p>This phone leaves {me.name}&apos;s seat so someone else can sit down or sign in. {me.name} stays in the room and returns any time with the same name and PIN.</p>
            <div className="btns">
              <button className="btn" type="button" onClick={switchPerson}>Switch person</button>
              <button className="btn ghost" type="button" onClick={() => setSwitching(false)}>Stay as {me.name}</button>
            </div>
          </>
        ) : (
          <>
            {!view.locked ? (
              <>
                <h1>You are in, {me.name}</h1>
                {me.isHost ? (
                  <>
                    <p>Invite the family to {view.name}. Lock the room once everyone has sat down. Locking opens Santa&apos;s jar.</p>
                    <SharePanel link={link} code={code} roomName={view.name} />
                    <p className="error" role="alert">{error}</p>
                    <button className="btn" type="button" disabled={busy || total < MIN_GUESTS} onClick={lockRoom}>
                      {total < MIN_GUESTS ? `Waiting for ${MIN_GUESTS - total} more guest${MIN_GUESTS - total === 1 ? '' : 's'}` : busy ? 'Locking…' : 'Lock room and open the jar'}
                    </button>
                  </>
                ) : (
                  <p>Welcome to {view.name}. Get comfy. {host ? host.name : 'The host'} opens Santa&apos;s jar once everyone has sat down.</p>
                )}
              </>
            ) : !me.pickName ? (
              <>
                <h1>Your turn, {me.name}</h1>
                <p>Santa&apos;s jar holds {view.papersLeft} rolled paper{view.papersLeft === 1 ? '' : 's'}. Pick any one.</p>
                <button className="btn big" type="button" onClick={openJar} disabled={picking}>Pick from the jar</button>
              </>
            ) : (
              <>
                <h1>Santa has spoken</h1>
                <ResultTag name={me.pickName} wish={me.pickWish} revealed={revealed} onToggle={() => setRevealed((r) => !r)} />
                <p className="note">Only you can see this tag. Your name and PIN open it again on any phone.</p>
              </>
            )}
            {progress}
            {details.length > 0 && <ul className="details">{details.map((d) => <li key={d}>{d}</li>)}</ul>}
            <WishField key={me.id} code={code} token={token.current} value={me.wish} onView={applyView} />
            <div className="btns foot">
              {me.isHost && <button className="btn ghost" type="button" onClick={() => setHostOpen(true)}>Manage guests</button>}
              <button className="btn ghost" type="button" onClick={() => setSwitching(true)}>Not {me.name}? Switch person</button>
            </div>
          </>
        )}
      </section>

      {picking && view && <JarPicker count={view.papersLeft} onChoose={drawPaper} onDone={afterDraw} onCancel={closeJar} />}
    </main>
  );
}
