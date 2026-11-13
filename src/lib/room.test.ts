import { describe, expect, it } from 'vitest';
import { choosePick, createRoom, findByToken, joinOrLogin, pick, publicView, removeGuest, resetPin, RoomError, setLocked, setWish } from './room';
import type { Room } from './types';

const NOW = 1_800_000_000_000;

function roomWith(names: string[]) {
  const { room, token } = createRoom('TEST01', { roomName: 'Party', name: names[0], pin: '1111', sweater: 0x2f7d57 }, NOW);
  const tokens: Record<string, string> = { [names[0]]: token };
  for (const name of names.slice(1)) {
    const out = joinOrLogin(room, { name, pin: '2222' }, NOW);
    tokens[name] = out.result!.token;
  }
  return { room, tokens };
}
const idOf = (room: Room, name: string) => room.guests.find((g) => g.name === name)!.id;
const status = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as RoomError).status; } return 0; };

/** Small seeded generator so failures are repeatable. */
function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

describe('create and join', () => {
  it('creates a room whose first guest is the host', () => {
    const { room, tokens } = roomWith(['Aira']);
    expect(room.hostId).toBe(room.guests[0].id);
    expect(findByToken(room, tokens.Aira)!.name).toBe('Aira');
    expect(findByToken(room, 'nope')).toBeNull();
  });

  it('rejects bad names and PINs', () => {
    const { room } = roomWith(['Aira']);
    expect(status(() => joinOrLogin(room, { name: '   ', pin: '1234' }, NOW))).toBe(400);
    expect(status(() => joinOrLogin(room, { name: 'Bea', pin: '12a4' }, NOW))).toBe(400);
    expect(status(() => createRoom('X', { roomName: '', name: 'A', pin: '1234' }, NOW))).toBe(400);
  });

  it('caps names at 20 characters and falls back to a valid sweater', () => {
    const { room } = roomWith(['Aira']);
    joinOrLogin(room, { name: 'Maria Cristina Dela Cruz', pin: '1234', sweater: 42 }, NOW);
    expect(room.guests[1].name).toBe('Maria Cristina Dela');
    joinOrLogin(room, { name: 'Lola Concepcion', pin: '1234' }, NOW);
    expect(room.guests[2].name).toBe('Lola Concepcion');
    expect(room.guests[1].sweater).toBe(0xc2283a);
  });

  it('signs an existing name back in with the right PIN, ignoring case', () => {
    const { room } = roomWith(['Aira', 'Bea']);
    const out = joinOrLogin(room, { name: 'bea', pin: '2222' }, NOW);
    expect(out.error).toBeUndefined();
    expect(room.guests).toHaveLength(2);
    expect(findByToken(room, out.result!.token)!.name).toBe('Bea');
  });

  it('refuses a taken name with the wrong PIN and locks it after 5 tries', () => {
    const { room } = roomWith(['Aira', 'Bea']);
    for (let i = 0; i < 5; i++) expect(joinOrLogin(room, { name: 'Bea', pin: '0000' }, NOW).error!.status).toBe(401);
    expect(joinOrLogin(room, { name: 'Bea', pin: '2222' }, NOW).error!.status).toBe(429);
    expect(joinOrLogin(room, { name: 'Bea', pin: '2222' }, NOW + 5 * 60 * 1000 + 1).error).toBeUndefined();
  });

  it('never leaks secrets or other picks in the public view', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    setLocked(room, room.hostId, true);
    pick(room, idOf(room, 'Bea'));
    const json = JSON.stringify(publicView(room, idOf(room, 'Aira')));
    expect(json).not.toMatch(/pinHash|pinSalt|tokenHashes/);
    expect(publicView(room, idOf(room, 'Aira')).me!.pickName).toBeNull();
    expect(publicView(room, idOf(room, 'Bea')).me!.pickName).toBeTruthy();
    expect(publicView(room, null).me).toBeNull();
  });
});

describe('wishes', () => {
  it('lets a guest set, trim, and clear their own wish', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    setWish(room, idOf(room, 'Bea'), '  Warm   socks  ');
    expect(publicView(room, idOf(room, 'Bea')).me!.wish).toBe('Warm socks');
    setWish(room, idOf(room, 'Bea'), 'x'.repeat(200));
    expect(publicView(room, idOf(room, 'Bea')).me!.wish).toHaveLength(80);
    setWish(room, idOf(room, 'Bea'), undefined);
    expect(publicView(room, idOf(room, 'Bea')).me!.wish).toBe('');
    expect(status(() => setWish(room, 'nobody', 'A pony'))).toBe(404);
  });

  it('shows a wish only to the guest who drew its owner', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    for (const name of ['Aira', 'Bea', 'Carla']) setWish(room, idOf(room, name), `Wish of ${name}`);
    // Nobody has picked: no view carries anyone else's wish, not even the host's.
    for (const name of ['Aira', 'Bea', 'Carla']) {
      const view = publicView(room, idOf(room, name));
      expect(view.me!.pickWish).toBe('');
      expect(JSON.stringify(view).match(/Wish of \w+/g)).toEqual([`Wish of ${name}`]);
    }
    expect(JSON.stringify(publicView(room, null))).not.toMatch(/Wish of/);
    setLocked(room, room.hostId, true);
    for (const name of ['Aira', 'Bea', 'Carla']) pick(room, idOf(room, name));
    for (const name of ['Aira', 'Bea', 'Carla']) {
      const view = publicView(room, idOf(room, name));
      expect(view.me!.pickWish).toBe(`Wish of ${view.me!.pickName}`);
      expect(new Set(JSON.stringify(view).match(/Wish of \w+/g))).toEqual(new Set([`Wish of ${name}`, `Wish of ${view.me!.pickName}`]));
    }
  });

  it('follows a wish changed after the pick, and loads guests saved before wishes existed', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    for (const g of room.guests) delete g.wish;
    setLocked(room, room.hostId, true);
    pick(room, idOf(room, 'Aira'));
    const before = publicView(room, idOf(room, 'Aira'));
    expect(before.me!.wish).toBe('');
    expect(before.me!.pickWish).toBe('');
    setWish(room, before.me!.pickId!, 'A book');
    expect(publicView(room, idOf(room, 'Aira')).me!.pickWish).toBe('A book');
  });
});

describe('host controls', () => {
  it('needs 3 guests to lock, and only the host can lock', () => {
    const { room } = roomWith(['Aira', 'Bea']);
    expect(status(() => setLocked(room, room.hostId, true))).toBe(409);
    joinOrLogin(room, { name: 'Carla', pin: '3333' }, NOW);
    expect(status(() => setLocked(room, idOf(room, 'Bea'), true))).toBe(403);
    setLocked(room, room.hostId, true);
    expect(room.locked).toBe(true);
  });

  it('blocks new guests once locked but lets existing guests sign in', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    setLocked(room, room.hostId, true);
    expect(status(() => joinOrLogin(room, { name: 'Dan', pin: '4444' }, NOW))).toBe(403);
    expect(joinOrLogin(room, { name: 'Carla', pin: '2222' }, NOW).result).toBeTruthy();
  });

  it('allows unlock only before the first pick', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    setLocked(room, room.hostId, true);
    setLocked(room, room.hostId, false);
    expect(room.locked).toBe(false);
    setLocked(room, room.hostId, true);
    pick(room, idOf(room, 'Bea'));
    expect(status(() => setLocked(room, room.hostId, false))).toBe(409);
  });

  it('removes guests only while unlocked, never the host', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla', 'Dan']);
    expect(status(() => removeGuest(room, room.hostId, room.hostId))).toBe(409);
    expect(status(() => removeGuest(room, idOf(room, 'Bea'), idOf(room, 'Dan')))).toBe(403);
    removeGuest(room, room.hostId, idOf(room, 'Dan'));
    expect(room.guests.map((g) => g.name)).toEqual(['Aira', 'Bea', 'Carla']);
    setLocked(room, room.hostId, true);
    expect(status(() => removeGuest(room, room.hostId, idOf(room, 'Bea')))).toBe(409);
  });

  it('PIN reset signs the guest out and lets them set a new PIN', () => {
    const { room, tokens } = roomWith(['Aira', 'Bea', 'Carla']);
    resetPin(room, room.hostId, idOf(room, 'Bea'));
    expect(findByToken(room, tokens.Bea)).toBeNull();
    expect(joinOrLogin(room, { name: 'Bea', pin: '9999' }, NOW).result).toBeTruthy();
    expect(joinOrLogin(room, { name: 'Bea', pin: '2222' }, NOW).error!.status).toBe(401);
    expect(joinOrLogin(room, { name: 'Bea', pin: '9999' }, NOW).result).toBeTruthy();
  });
});

describe('picking', () => {
  it('needs a locked room and allows one pick per guest', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    expect(status(() => pick(room, idOf(room, 'Bea')))).toBe(409);
    setLocked(room, room.hostId, true);
    pick(room, idOf(room, 'Bea'));
    expect(status(() => pick(room, idOf(room, 'Bea')))).toBe(409);
  });

  it('lets only the host pick on behalf of someone', () => {
    const { room } = roomWith(['Aira', 'Bea', 'Carla']);
    setLocked(room, room.hostId, true);
    expect(status(() => pick(room, idOf(room, 'Bea'), idOf(room, 'Carla')))).toBe(403);
    const out = pick(room, room.hostId, idOf(room, 'Carla'));
    expect(out.result).toEqual({ pickerId: idOf(room, 'Carla'), onBehalf: true });
    expect(room.guests.find((g) => g.name === 'Aira')!.pick).toBeNull();
  });

  it('forces the second-to-last picker to take the last picker when that avoids a dead end', () => {
    // A drew B, so C and B still wait. C is undrawn. B must draw C, or C would be left with only C.
    const guests = [{ id: 'A', pick: 'B' }, { id: 'B', pick: null }, { id: 'C', pick: null }];
    for (let i = 0; i < 50; i++) expect(choosePick(guests, 'B', seeded(i))).toBe('C');
  });

  it('always ends with everyone drawing exactly one other person, for every size and order', () => {
    for (let n = 3; n <= 30; n++) {
      for (let trial = 0; trial < 60; trial++) {
        const rng = seeded(n * 1000 + trial);
        const guests = Array.from({ length: n }, (_, i) => ({ id: 'g' + i, pick: null as string | null }));
        const order = guests.map((g) => g.id).sort(() => rng() - 0.5);
        for (const id of order) guests.find((g) => g.id === id)!.pick = choosePick(guests, id, rng);
        const picks = guests.map((g) => g.pick);
        expect(new Set(picks).size).toBe(n);
        expect(guests.every((g) => g.pick && g.pick !== g.id)).toBe(true);
      }
    }
  });
});
