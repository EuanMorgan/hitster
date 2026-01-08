# Hitster - Online Multiplayer Music Timeline Game

## Overview

A Jackbox-style online multiplayer adaptation of the Hitster board game. Host creates a game room, players join on their phones via PIN code, and compete to build a timeline of songs ordered by release year.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Styling**: Tailwind CSS, shadcn/ui components
- **API**: tRPC with TanStack React Query (server component prefetch patterns)
- **Database**: PostgreSQL (local dev setup), Drizzle ORM + drizzle-kit
- **Auth**: Better Auth with Spotify OAuth
- **Real-time**: tRPC subscriptions (fallback: Socket.io)
- **Music**: Spotify Web Playback SDK
- **Forms**: react-hook-form + zod validation + shadcn Form
- **Dev Tools**: TanStack Query Devtools

## Architecture Patterns

- Server Components for data fetching, push client components to leaf nodes
- React Suspense with skeleton loaders
- E2E type-safe API via tRPC
- Mobile-first responsive design
- Light/dark mode (shadcn theming)
- Hosting agnostic (Vercel-ready, dockerizable)

---

## Requirements

See [prd.json](./plans/prd.json) for the full requirements list in machine-readable format.

**Categories**: setup, authentication, lobby, gameplay, stealing, tokens, turns, winning, playlist, reconnection, display, statistics, ui, database, api, spotify, deployment

**Total Requirements**: 68

---

## Settings Defaults

| Setting | Default | Range |
|---------|---------|-------|
| Songs to win | 10 | 5-20 |
| Song play duration | 30s | 15-60s |
| Turn duration | 45s | 30-90s |
| Steal window | 10s | 5-20s |
| Max players | 10 | 1-20 |
| Playlist | Default (linked above) | Any public/accessible Spotify playlist |

---

## Game Flow Summary

```
1. HOST LOGIN
   └── Spotify OAuth (premium required)

2. CREATE GAME
   ├── Generate 4-char PIN
   ├── Configure settings
   └── Share PIN/QR

3. PLAYERS JOIN
   ├── Enter PIN
   ├── Enter name
   └── Select emoji avatar

4. GAME START (host initiates)
   ├── Each player gets 2 tokens + 1 random song in timeline
   └── Shuffle turn order

5. TURN LOOP
   ├── Play song (30s, no metadata shown)
   ├── Player drags song in timeline
   ├── Optional: guess song/artist
   ├── Confirm or timeout
   ├── STEAL PHASE (10s)
   │   ├── Song continues from where stopped
   │   └── Others can spend 1 token to steal
   ├── Reveal results
   └── Next player

6. WIN CONDITION
   ├── First to target songs wins
   ├── Game ends immediately
   └── Show results + party stats

7. REMATCH (optional)
   ├── New players can join
   └── Party stats preserved
```

---

## Non-Functional Requirements

- **Performance**: Sub-100ms response for real-time updates
- **Reliability**: Graceful handling of disconnections
- **Security**: Spotify tokens encrypted, no session hijacking
- **Accessibility**: WCAG 2.1 AA compliance where feasible
- **Mobile**: Touch-optimized, works on iOS Safari and Chrome Android
