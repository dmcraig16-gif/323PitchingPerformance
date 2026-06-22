# Athlete Hub

Coach/athlete platform for delivering programming, mental-game content,
journaling, devotionals, and habit tracking.

See `../ATHLETE_HUB_PLAN.md` for the full architecture and build order.

## Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor
3. Copy `.env.example` to `.env` and fill in your project URL + anon key
4. `npm install && npm run dev`

## Status

Scaffold stage: routing, auth pages, and role-based shell are in place with
placeholder screens. Data wiring happens incrementally per
`ATHLETE_HUB_PLAN.md` step 1 onward.
