import { NextResponse } from 'next/server';
import { findByToken, joinOrLogin, pick, publicView, removeGuest, resetPin, RoomError, setLocked, setWish } from '@/lib/room';
import { getRoom, mutate } from '@/lib/store';
import { bearer, fail } from '@/lib/respond';
import type { Room } from '@/lib/types';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const room = await getRoom((await params).code);
    return NextResponse.json({ view: publicView(room, findByToken(room, bearer(req))?.id ?? null) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const token = bearer(req);

    if (body.type === 'join') {
      const { room, result } = await mutate(code, (r) => joinOrLogin(r, body, Date.now()));
      return NextResponse.json({ token: result.token, view: publicView(room, result.guestId) });
    }

    /** Every other action needs a signed-in guest. The actor is resolved inside the rule so it sees fresh state. */
    const actor = (room: Room) => {
      const me = findByToken(room, token);
      if (!me) throw new RoomError(401, 'Sign in to this room again with your name and PIN.');
      return me.id;
    };
    let meId = '';
    const run = <T,>(rule: (room: Room, id: string) => { room?: Room; result?: T; error?: RoomError }) =>
      mutate(code, (r) => { meId = actor(r); return rule(r, meId); });

    switch (body.type) {
      case 'lock': { const { room } = await run((r, id) => setLocked(r, id, true)); return NextResponse.json({ view: publicView(room, meId) }); }
      case 'unlock': { const { room } = await run((r, id) => setLocked(r, id, false)); return NextResponse.json({ view: publicView(room, meId) }); }
      case 'remove': { const { room } = await run((r, id) => removeGuest(r, id, body.guestId)); return NextResponse.json({ view: publicView(room, meId) }); }
      case 'resetPin': { const { room } = await run((r, id) => resetPin(r, id, body.guestId)); return NextResponse.json({ view: publicView(room, meId) }); }
      case 'pick': { const { room } = await run((r, id) => pick(r, id, body.forGuestId)); return NextResponse.json({ view: publicView(room, meId) }); }
      case 'setWish': { const { room } = await run((r, id) => setWish(r, id, body.wish)); return NextResponse.json({ view: publicView(room, meId) }); }
      default: throw new RoomError(400, 'Unknown action.');
    }
  } catch (e) {
    return fail(e);
  }
}
