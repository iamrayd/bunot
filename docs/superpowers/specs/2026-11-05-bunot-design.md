# Bunot: manito / manita picker

## Goal

A group opens one link on their own devices, sits in a 3D Christmas room, and each person draws a rolled paper from Santa's jar to learn who they buy a gift for. Each result is private.

## Version 1 scope

In: landing page, create room, join room, lobby, pick from jar, private result, host controls, live view of guests joining and picking.

Out: wishlists, sound, avatar choices beyond sweater color, email or social login.

## Rules

- A room has a 6-character code. Guests join with a name (max 14 characters), a 4-digit PIN, and a sweater color.
- Names are unique per room, compared without case. Entering an existing name with its PIN signs that guest back in on any device.
- Five wrong PINs lock that name for five minutes.
- The host is the guest who created the room. The host also picks.
- The host locks the room to open the jar. Locking needs at least 3 guests. Nobody new can join a locked room. The host can unlock until the first pick; after that the lock is permanent.
- The host can remove a guest while the room is unlocked, reset a guest's PIN (the guest then sets a new PIN at next sign-in), and pick on behalf of a guest who has not picked. The host never sees any result except their own.
- A room holds at most 30 guests.

## The pick

The paper a guest taps does not carry a name. The server assigns the name when the guest taps:

- Candidates are guests nobody has drawn yet, minus the picker.
- If exactly two guests have not picked and the other one has not been drawn, the picker gets that other guest. Without this rule the last guest could be left with only their own name.
- Otherwise the server chooses a random candidate.

This guarantees every guest draws exactly one name, is drawn exactly once, and never draws their own.

## Architecture

- Next.js App Router on Vercel. Three.js (pinned to 0.128.0, the version the approved mockup was built on) draws the room.
- One Supabase table, `rooms(code, state jsonb, version)`. The whole room is one JSON document. Every change is read, modify, then a conditional update on `version`, retried on conflict. This makes each change atomic without database functions and keeps all rules in TypeScript.
- Row level security is on with no policies. Only the server, using the service role key, reads or writes rooms. Browsers never see PIN hashes or other guests' picks.
- Browsers talk to two route handlers: `POST /api/rooms` (create) and `GET` / `POST /api/rooms/[code]` (view, and actions `join`, `lock`, `unlock`, `remove`, `resetPin`, `pick`).
- A guest's session is a random token kept in the browser's local storage; the server stores only its SHA-256 hash. PINs are stored as salted scrypt hashes.
- Live updates: after each change the server sends a Supabase Realtime broadcast on `room:CODE`. Browsers refetch the view when it arrives, and also poll every few seconds as a fallback.
- Local development without Supabase uses an in-memory store. Production refuses to start a room without Supabase configured.

## Modules

- `src/lib/room.ts`: pure room rules. Unit tested.
- `src/lib/auth.ts`: ids, tokens, PIN hashing.
- `src/lib/store.ts`: storage (Supabase or memory), compare-and-swap `mutate`, broadcast.
- `src/scene/roomScene.js`: the 3D room. Takes a guest list, exposes `setGuests`, `flyPaper`, `setJarRaised`, `setStar`, `say`, `burst`.
- `src/app/page.tsx`: landing. `src/app/r/[code]`: the room.

## Testing

- Unit tests for the room rules, including a randomized test that every pick order ends in a valid assignment.
- A browser run through create, join, lock, pick, and result with several guests.

## Known limits

- A 4-digit PIN is light protection, suited to a friendly gift exchange.
- While a PIN reset is pending, whoever signs in with that name first sets the new PIN.
- Room creation has no rate limit.
