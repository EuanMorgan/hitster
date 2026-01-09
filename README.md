# Hitster

A Jackbox-style online multiplayer adaptation of the Hitster board game. Host creates a game room, players join via PIN code, and compete to build a timeline of songs ordered by release year.

## Getting Started

```bash
# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Requirements

- Spotify Premium account (for host to play music via Web Playback SDK)
- PostgreSQL database
- Environment variables configured (see `.env.example`)

## Real-time Performance

Hitster uses Server-Sent Events (SSE) via tRPC subscriptions for real-time game state updates.

### Architecture

- **SSE subscriptions** push updates instantly when game state changes
- **Fallback polling** every 2 seconds kicks in if SSE connection fails
- **In-memory EventEmitter** broadcasts updates to connected clients

### Vercel Deployment Considerations

**Function timeout:** Vercel serverless functions have a 10s default timeout (30s on Pro). SSE connections stay open longer, so Vercel terminates them at the timeout boundary. The client reconnects automatically, causing brief latency spikes.

**Expected behavior on Vercel:**
- Latency: 50-200ms typical, with occasional 1-3s spikes during reconnection
- Connection drops every 30s (function timeout limit set in vercel.json)
- Client auto-reconnects with seamless fallback to polling

**Mobile browser caveats:**
- Safari/Chrome throttle background tabs, pausing SSE connections
- When tab returns to foreground, reconnection takes 1-2s
- Game remains playable due to polling fallback

### Recommendations

| Deployment | Real-time Quality | Notes |
|------------|-------------------|-------|
| Vercel Pro | Good | 30s function timeout, adequate for casual games |
| VPS (Railway, Render, self-hosted) | Best | Persistent connections, <100ms latency |
| Vercel Hobby | Acceptable | 10s timeout, more frequent reconnections |

**For optimal real-time performance with large player counts (>6 players) or competitive play, deploy on a VPS where connections can persist indefinitely.**

### Testing Real-time

To test subscription performance locally:

```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Open multiple browser tabs
# Join the same game from different tabs
# Watch console for "Subscription error" messages
# Measure time from clicking confirm to seeing result on other clients
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **API**: tRPC with TanStack React Query + SSE subscriptions
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth with Spotify OAuth
- **Music**: Spotify Web Playback SDK
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest + Testing Library + MSW + Playwright

## Development Commands

```bash
bun dev              # Development server
bun run build        # Production build
bun run test         # Run vitest tests (NOT `bun test`)
bun test:e2e         # E2E tests with Playwright
bun lint             # Biome check
bun typecheck        # TypeScript check
bun db:push          # Push schema to DB
bun db:studio        # Open Drizzle Studio
```

## Deploy on Vercel

The easiest way to deploy is via [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

For best real-time performance, consider VPS deployment (Railway, Render, or self-hosted with Docker).
