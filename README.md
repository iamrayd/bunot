# Bunot

A manito / manita (secret gift exchange) picker. Your group opens one link, sits in Santa's 3D living room, and each guest draws a rolled paper from Santa's jar. Each result is private.

## How it works

1. The host starts a room and shares the link or 6-character code.
2. Guests join with a name, a 4-digit PIN, and a sweater color. Everyone sees everyone else sit down.
3. The host locks the room (3 guests minimum). That opens the jar.
4. Each guest taps a paper. The server assigns a name: never their own, never one already drawn, and never in a way that leaves the last guest stuck.
5. A guest's name and PIN reopen their result on any device.

The design and rules are in [docs/superpowers/specs/2026-11-05-bunot-design.md](docs/superpowers/specs/2026-11-05-bunot-design.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase settings, rooms live in memory and vanish when the server restarts. That is fine for trying it out.

```bash
npm test        # unit tests for the room rules
npm run build   # production build
```

## Deploy

### 1. Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and run it.
3. Open **Project Settings > API** and copy the project URL, the `anon` key, and the `service_role` key.

### 2. Vercel

1. Import this repository at https://vercel.com/new.
2. Add these environment variables (see [.env.example](.env.example)):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key. Secret, server only. |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key |

3. Deploy.

The two `NEXT_PUBLIC_` values only let browsers hear "this room changed" pings, so updates show instantly. Without them the app still works and refreshes every 4 seconds.

## Privacy model

- The `rooms` table has row level security on and no policies. Browsers cannot read it. Only the server, with the service role key, can.
- The server never sends PIN hashes or anyone else's pick to a browser. The host sees who has picked, never who they drew.
- PINs are stored as salted scrypt hashes. Five wrong PINs lock a name for five minutes.

## Layout

- `src/lib/room.ts` room rules (pure, unit tested)
- `src/lib/store.ts` storage with compare-and-swap, Supabase or in-memory
- `src/app/api/rooms` the two API routes
- `src/scene/roomScene.js` the 3D room (Three.js)
- `src/app/page.tsx` landing, `src/app/r/[code]` the room
