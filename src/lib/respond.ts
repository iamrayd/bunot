import { NextResponse } from 'next/server';
import { RoomError } from './room';

export function fail(e: unknown) {
  if (e instanceof RoomError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'Something went wrong on the server. Try again.' }, { status: 500 });
}

export function bearer(req: Request) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
