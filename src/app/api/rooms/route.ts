import { NextResponse } from 'next/server';
import { newRoomCode } from '@/lib/auth';
import { createRoom, publicView, RoomError } from '@/lib/room';
import { insertRoom } from '@/lib/store';
import { fail } from '@/lib/respond';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    for (let attempt = 0; attempt < 5; attempt++) {
      const { room, token } = createRoom(newRoomCode(), body, Date.now());
      if (await insertRoom(room)) return NextResponse.json({ token, view: publicView(room, room.hostId) });
    }
    throw new RoomError(503, 'Could not make a room code. Try again.');
  } catch (e) {
    return fail(e);
  }
}
