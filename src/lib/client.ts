import type { RoomView } from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong. Try again.');
  return data as T;
}

export type Identity = { name: string; pin: string; sweater: number };

export const api = {
  create: (body: Identity & { roomName: string; exchangeDate: string; budget: string }) =>
    call<{ token: string; view: RoomView }>('/api/rooms', { method: 'POST', body }),
  view: (code: string, token: string | null) => call<{ view: RoomView }>(`/api/rooms/${code}`, { token }),
  join: (code: string, body: Identity) => call<{ token: string; view: RoomView }>(`/api/rooms/${code}`, { method: 'POST', body: { type: 'join', ...body } }),
  act: (code: string, token: string | null, body: { type: 'lock' | 'unlock' | 'remove' | 'resetPin' | 'pick'; guestId?: string; forGuestId?: string }) =>
    call<{ view: RoomView }>(`/api/rooms/${code}`, { method: 'POST', token, body }),
};

const key = (code: string) => `bunot:${code}`;
export function loadToken(code: string) { try { return localStorage.getItem(key(code)); } catch { return null; } }
export function saveToken(code: string, token: string) { try { localStorage.setItem(key(code), token); } catch { /* private mode */ } }

export const cleanCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
