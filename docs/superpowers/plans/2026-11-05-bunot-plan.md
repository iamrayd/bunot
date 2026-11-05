# Bunot build plan

Companion to the design spec: [../specs/2026-11-05-bunot-design.md](../specs/2026-11-05-bunot-design.md).

Status as of 2026-11-05: phases 1 to 5 are built and tested locally. Phase 6 (go live) needs the owner's Supabase and Vercel accounts. Phase 7 is the backlog.

## Phase 1: UI mockup (done)

- [x] Single-page 3D mockup: Santa, fireplace, tree, window, parol, guests on the rug.
- [x] First mechanic: Santa rolls dice and a star counts along the guests.
- [x] Changed on review: Santa holds a jar of rolled papers and the guest picks one.
- [x] Browser QA of the mockup on desktop and phone sizes; fixed the bugs it found.

## Phase 2: decisions (done)

- [x] Each guest uses their own device. Results are private.
- [x] Join with room code, name, and 4-digit PIN.
- [x] Host locks the room, then guests pick whenever they like.
- [x] Stack: Next.js and Three.js on Vercel, Supabase for storage and live pings.
- [x] Rules: unique names, host can reset a PIN, no joining after lock, lock is permanent after the first pick, 3 guests minimum, host also picks, wording stays "manito / manita".

## Phase 3: server (done)

- [x] `src/lib/room.ts`: create, join or sign in, lock, remove guest, reset PIN, pick, public view.
- [x] Pick rule that can never strand the last guest, with a randomized test over every room size from 3 to 30.
- [x] `src/lib/auth.ts`: ids, session tokens, salted scrypt PIN hashes, 5-try lockout.
- [x] `src/lib/store.ts`: one JSON row per room, compare-and-swap on `version`, Supabase or in-memory.
- [x] API routes: `POST /api/rooms`, `GET` and `POST /api/rooms/[code]`.
- [x] `supabase/schema.sql` with row level security on and no policies.

## Phase 4: client (done)

- [x] `src/scene/roomScene.js`: the mockup scene as a module driven by a guest list.
- [x] Landing page: start a room or join by code.
- [x] Room page: join, lobby, pick from the jar, private result tag, hide tag.
- [x] Host controls: share link, lock and unlock, remove, reset PIN, pick for a guest.
- [x] Live updates: Supabase broadcast ping plus a 4-second poll as fallback.
- [x] Other guests' arrivals and picks animate in the room.

## Phase 5: verification (done locally)

- [x] 15 unit tests for the room rules (`npm test`).
- [x] 46 end-to-end checks in headless Chrome against the production build: create, join, live guest arrival, lock, 4 simultaneous picks, Escape on the jar, reload, sign-in on a second device, stranger blocked after lock, phone layout.
- [x] Phone portrait: the room now frames itself in the space between the top bar and the panel.
- [x] The guest's own seat is front and center.

Not verified yet:

- [ ] The Supabase storage and broadcast path. Local tests ran on the in-memory store.
- [ ] Real phones, Safari, Firefox.
- [ ] A browser session with more than 5 guests.

## Phase 6: go live (owner)

- [ ] Create a Supabase project and run `supabase/schema.sql`.
- [ ] Import the repository in Vercel.
- [ ] Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Deploy, then run one full exchange with 3 test guests on two devices.

## Phase 7: backlog

Known gaps:

- [ ] With an even number of guests the ring has one empty slot, so it looks slightly lopsided.
- [ ] The landing form on a phone needs a scroll to reach its button.
- [ ] No rate limit on room creation.
- [ ] While a PIN reset is pending, whoever signs in with that name first sets the new PIN.

Left out of version 1:

- [ ] Wishlist per guest.
- [ ] Sound and music.
- [ ] Avatar choices beyond sweater color.
- [ ] A reveal day where everyone's pick is shown.
