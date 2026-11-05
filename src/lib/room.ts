import { checkPin, hashPin, hashToken, newId, newToken } from './auth';
import { MAX_GUESTS, MIN_GUESTS, SWEATERS, type Guest, type Room, type RoomView } from './types';

export class RoomError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** What a rule returns: the room to save (if it changed), a result, and optionally an error to raise after saving. */
export type Outcome<T> = { room?: Room; result?: T; error?: RoomError };

const MAX_FAILS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const clean = (raw: unknown, max: number) => String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function validName(raw: unknown) {
  const name = clean(raw, 14);
  if (!name) throw new RoomError(400, 'Type your name so Santa knows who you are.');
  return name;
}
function validPin(raw: unknown) {
  const pin = String(raw ?? '');
  if (!/^\d{4}$/.test(pin)) throw new RoomError(400, 'Your PIN needs exactly 4 digits.');
  return pin;
}
function validSweater(raw: unknown) {
  const n = Number(raw);
  return (SWEATERS as readonly number[]).includes(n) ? n : SWEATERS[0];
}

function makeGuest(name: string, pin: string, sweater: number, now: number) {
  const { salt, hash } = hashPin(pin);
  const token = newToken();
  const guest: Guest = {
    id: newId(), name, nameKey: name.toLowerCase(), sweater, pinSalt: salt, pinHash: hash, pinReset: false,
    tokenHashes: [hashToken(token)], fails: 0, lockedUntil: 0, pick: null, joinedAt: now,
  };
  return { guest, token };
}

export type JoinInput = { name?: unknown; pin?: unknown; sweater?: unknown };
export type CreateInput = JoinInput & { roomName?: unknown; exchangeDate?: unknown; budget?: unknown };

export function createRoom(code: string, input: CreateInput, now: number) {
  const roomName = clean(input.roomName, 40);
  if (!roomName) throw new RoomError(400, 'Give the room a name, like "Team Christmas party".');
  const exchangeDate = clean(input.exchangeDate, 10);
  if (exchangeDate && !/^\d{4}-\d{2}-\d{2}$/.test(exchangeDate)) throw new RoomError(400, 'Pick a valid exchange date.');
  const { guest, token } = makeGuest(validName(input.name), validPin(input.pin), validSweater(input.sweater), now);
  const room: Room = {
    code, name: roomName, exchangeDate, budget: clean(input.budget, 20), hostId: guest.id, locked: false, createdAt: now, guests: [guest],
  };
  return { room, token };
}

export function findByToken(room: Room, token: string | null | undefined) {
  if (!token) return null;
  const h = hashToken(token);
  return room.guests.find((g) => g.tokenHashes.includes(h)) ?? null;
}

function signIn(guest: Guest) {
  const token = newToken();
  guest.tokenHashes = [...guest.tokenHashes, hashToken(token)].slice(-5);
  guest.fails = 0;
  guest.lockedUntil = 0;
  return token;
}

/** New name: join as a new guest. Existing name: sign back in with its PIN. */
export function joinOrLogin(room: Room, input: JoinInput, now: number): Outcome<{ token: string; guestId: string }> {
  const name = validName(input.name);
  const pin = validPin(input.pin);
  const existing = room.guests.find((g) => g.nameKey === name.toLowerCase());

  if (existing) {
    if (existing.pinReset) {
      const { salt, hash } = hashPin(pin);
      Object.assign(existing, { pinSalt: salt, pinHash: hash, pinReset: false });
      return { room, result: { token: signIn(existing), guestId: existing.id } };
    }
    if (existing.lockedUntil > now) {
      const mins = Math.ceil((existing.lockedUntil - now) / 60000);
      return { error: new RoomError(429, `Too many wrong PINs for this name. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`) };
    }
    if (!checkPin(pin, existing.pinSalt, existing.pinHash)) {
      existing.fails += 1;
      if (existing.fails >= MAX_FAILS) { existing.fails = 0; existing.lockedUntil = now + LOCKOUT_MS; }
      return { room, error: new RoomError(401, `"${existing.name}" is already in this room. If that is you, enter your PIN. If not, use a different name.`) };
    }
    return { room, result: { token: signIn(existing), guestId: existing.id } };
  }

  if (room.locked) throw new RoomError(403, 'This room is locked. Only guests who already joined can sign in.');
  if (room.guests.length >= MAX_GUESTS) throw new RoomError(403, `This room is full (${MAX_GUESTS} guests).`);
  const { guest, token } = makeGuest(name, pin, validSweater(input.sweater), now);
  room.guests.push(guest);
  return { room, result: { token, guestId: guest.id } };
}

const started = (room: Room) => room.guests.some((g) => g.pick);

function requireHost(room: Room, actorId: string) {
  if (room.hostId !== actorId) throw new RoomError(403, 'Only the host can do that.');
}
function requireGuest(room: Room, id: unknown) {
  const g = room.guests.find((x) => x.id === id);
  if (!g) throw new RoomError(404, 'That guest is not in this room.');
  return g;
}

export function setLocked(room: Room, actorId: string, locked: boolean): Outcome<null> {
  requireHost(room, actorId);
  if (locked && room.guests.length < MIN_GUESTS) throw new RoomError(409, `You need at least ${MIN_GUESTS} guests before you lock the room.`);
  if (!locked && started(room)) throw new RoomError(409, 'Someone has already picked, so the room stays locked.');
  room.locked = locked;
  return { room, result: null };
}

export function removeGuest(room: Room, actorId: string, guestId: unknown): Outcome<null> {
  requireHost(room, actorId);
  const g = requireGuest(room, guestId);
  if (g.id === room.hostId) throw new RoomError(409, 'The host cannot be removed.');
  if (room.locked) throw new RoomError(409, 'Unlock the room before you remove a guest.');
  room.guests = room.guests.filter((x) => x.id !== g.id);
  return { room, result: null };
}

export function resetPin(room: Room, actorId: string, guestId: unknown): Outcome<null> {
  requireHost(room, actorId);
  const g = requireGuest(room, guestId);
  Object.assign(g, { pinReset: true, tokenHashes: [], fails: 0, lockedUntil: 0 });
  return { room, result: null };
}

/**
 * Chooses who `pickerId` draws. Guarantees the draw can always finish with nobody drawing themselves:
 * when two pickers remain and the other one is still undrawn, the picker must take that other guest.
 */
export function choosePick(guests: Pick<Guest, 'id' | 'pick'>[], pickerId: string, rng: () => number = Math.random): string {
  const drawn = new Set(guests.map((g) => g.pick).filter(Boolean));
  const undrawn = guests.filter((g) => !drawn.has(g.id)).map((g) => g.id);
  const waiting = guests.filter((g) => !g.pick).map((g) => g.id);
  const options = undrawn.filter((id) => id !== pickerId);
  if (!options.length) throw new RoomError(500, 'No name is left to draw. Ask the host to check the room.');
  if (waiting.length === 2) {
    const other = waiting.find((id) => id !== pickerId)!;
    if (options.includes(other)) return other;
  }
  return options[Math.floor(rng() * options.length)];
}

/** A guest picks for themselves, or the host picks on behalf of `forGuestId`. */
export function pick(room: Room, actorId: string, forGuestId?: unknown, rng?: () => number): Outcome<{ pickerId: string; onBehalf: boolean }> {
  const onBehalf = !!forGuestId && forGuestId !== actorId;
  if (onBehalf) requireHost(room, actorId);
  const picker = requireGuest(room, onBehalf ? forGuestId : actorId);
  if (!room.locked) throw new RoomError(409, 'The jar opens after the host locks the room.');
  if (picker.pick) throw new RoomError(409, onBehalf ? `${picker.name} has already picked.` : 'You have already picked.');
  picker.pick = choosePick(room.guests, picker.id, rng);
  return { room, result: { pickerId: picker.id, onBehalf } };
}

export function publicView(room: Room, meId: string | null): RoomView {
  const me = room.guests.find((g) => g.id === meId) ?? null;
  const drawn = new Set(room.guests.map((g) => g.pick).filter(Boolean));
  const picked = me?.pick ? room.guests.find((g) => g.id === me.pick) ?? null : null;
  return {
    code: room.code, name: room.name, exchangeDate: room.exchangeDate, budget: room.budget,
    locked: room.locked, started: started(room), papersLeft: room.guests.length - drawn.size,
    guests: room.guests.map((g) => ({ id: g.id, name: g.name, sweater: g.sweater, hasPicked: !!g.pick, isHost: g.id === room.hostId, pinReset: g.pinReset })),
    me: me ? { id: me.id, name: me.name, isHost: me.id === room.hostId, pickId: picked?.id ?? null, pickName: picked?.name ?? null } : null,
  };
}
