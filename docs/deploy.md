# Deploying Bunot

Bunot runs on Vercel and stores rooms in Supabase. Without the Supabase variables, a production deploy answers every room request with a 503 ("The server is not connected to its database yet").

## 1. Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it. This creates the `rooms` table with row level security on and no policies.
3. Copy these values:
   - **Project URL**: Project Settings > Data API (older layout: Project Settings > API). It looks like `https://xxxx.supabase.co`.
   - **anon key** and **service_role key**: Project Settings > API Keys > Legacy API keys tab. Supabase's newer names work too: a Publishable key (`sb_publishable_...`) replaces `anon`, and a Secret key (`sb_secret_...`) replaces `service_role`.

## 2. Vercel

1. Import `iamrayd/bunot` at https://vercel.com/new.
2. Choose the production branch. Merge `polish-family-gathering` into `main`, or set it as the production branch.
3. Add these environment variables:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` or Secret key. Server only. Never commit it or prefix it with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` or Publishable key |

4. Deploy.

The two `NEXT_PUBLIC_` values only let browsers hear "this room changed" pings. Without them the app still works and refreshes every 4 seconds.

## 3. Check the deploy

1. Open the deployed URL and create a room.
2. Open the room link on a second device, join with another name, and confirm the first device updates.
3. If you see "The room is not ready", the Supabase variables are missing or wrong. Fix them in Vercel and redeploy.

## Using the Vercel CLI instead

```bash
npm i -g vercel
vercel login
vercel link
vercel env add SUPABASE_SERVICE_ROLE_KEY production   # prompts for the value
vercel --prod
```

Repeat `vercel env add` for the other three variables.

## Before you deploy

- `npm test` and `npm run build` should both pass.
- Known limits from the security review: a 4-digit PIN with a 5-try lockout, host PIN reset that lets anyone with the room link claim the seat, and no rate limit on room creation. See the README privacy model for what the app promises.
