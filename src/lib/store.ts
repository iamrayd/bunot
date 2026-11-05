import { RoomError, type Outcome } from './room';
import type { Room } from './types';

type Row = { state: Room; version: number };

interface Store {
  get(code: string): Promise<Row | null>;
  /** false when the code already exists */
  insert(code: string, state: Room): Promise<boolean>;
  /** Saves only if the row is still at `version`. false means someone else changed it first. */
  cas(code: string, version: number, state: Room): Promise<boolean>;
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function supabaseStore(): Store {
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const rest = `${SUPABASE_URL}/rest/v1/rooms`;
  const fail = async (res: Response) => new RoomError(502, `Database error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return {
    async get(code) {
      const res = await fetch(`${rest}?code=eq.${encodeURIComponent(code)}&select=state,version`, { headers, cache: 'no-store' });
      if (!res.ok) throw await fail(res);
      const rows = (await res.json()) as Row[];
      return rows[0] ?? null;
    },
    async insert(code, state) {
      const res = await fetch(rest, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ code, state, version: 1 }) });
      if (res.status === 409) return false;
      if (!res.ok) throw await fail(res);
      return true;
    },
    async cas(code, version, state) {
      const res = await fetch(`${rest}?code=eq.${encodeURIComponent(code)}&version=eq.${version}`, {
        method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ state, version: version + 1, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) throw await fail(res);
      return ((await res.json()) as unknown[]).length === 1;
    },
  };
}

function memoryStore(): Store {
  const g = globalThis as unknown as { __bunotRooms?: Map<string, Row> };
  const rooms = (g.__bunotRooms ??= new Map());
  return {
    async get(code) { const r = rooms.get(code); return r ? structuredClone(r) : null; },
    async insert(code, state) { if (rooms.has(code)) return false; rooms.set(code, { state: structuredClone(state), version: 1 }); return true; },
    async cas(code, version, state) {
      const r = rooms.get(code);
      if (!r || r.version !== version) return false;
      rooms.set(code, { state: structuredClone(state), version: version + 1 });
      return true;
    },
  };
}

let store: Store | null = null;
function getStore(): Store {
  if (store) return store;
  if (SUPABASE_URL && SERVICE_KEY) return (store = supabaseStore());
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_STORE !== '1') {
    throw new RoomError(503, 'The server is not connected to its database yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return (store = memoryStore());
}

export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export async function getRoom(code: string): Promise<Room> {
  const row = await getStore().get(normalizeCode(code));
  if (!row) throw new RoomError(404, 'No room has this code. Check the code and try again.');
  return row.state;
}

export async function insertRoom(room: Room) {
  return getStore().insert(room.code, room);
}

/** Tells browsers in the room to refetch. Best effort: polling covers a missed broadcast. */
async function notify(code: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ topic: `room:${code}`, event: 'changed', payload: {} }] }),
      signal: AbortSignal.timeout(1500),
    });
  } catch { /* ignore */ }
}

/** Read, apply a rule, save if unchanged underneath us; retry when another request got there first. */
export async function mutate<T>(rawCode: string, rule: (room: Room) => Outcome<T>): Promise<{ room: Room; result: T }> {
  const code = normalizeCode(rawCode);
  const s = getStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await s.get(code);
    if (!row) throw new RoomError(404, 'No room has this code. Check the code and try again.');
    const out = rule(row.state);
    if (out.room) {
      if (!(await s.cas(code, row.version, out.room))) continue;
      await notify(code);
    }
    if (out.error) throw out.error;
    return { room: out.room ?? row.state, result: out.result as T };
  }
  throw new RoomError(409, 'The room is busy. Try again.');
}
