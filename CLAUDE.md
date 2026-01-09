# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Philosophy

This codebase will outlive you. Every shortcut you take becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down.

You are not just writing code. You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

## Project Overview

Hitster is a Jackbox-style online multiplayer adaptation of the Hitster board game. Host creates a game room, players join via PIN code, and compete to build a timeline of songs ordered by release year.

## Development Commands

**IMPORTANT: Always use `bun` instead of `npm` for all commands.**

```bash
# Development server
bun dev

# Build
bun run build

# Testing
bun run test          # Run vitest tests (NOT `bun test` - that uses bun's native runner)
bun test:watch        # Watch mode
bun test:coverage     # With coverage
bun test:e2e          # Playwright E2E tests
bun test:e2e:ui       # E2E with UI

# Linting/Formatting
bun lint              # Biome check
bun format            # Biome format --write
bun typecheck         # tsc --noEmit

# Database (Drizzle)
bun db:push           # Push schema to DB
bun db:studio         # Open Drizzle Studio
bun db:generate       # Generate migrations
bun db:migrate        # Run migrations
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **API**: tRPC with TanStack React Query + SSE subscriptions for real-time
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth with Spotify OAuth
- **Music**: Spotify Web Playback SDK (Premium required)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest + Testing Library + MSW + Playwright
- **Linting**: Biome

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router pages
- `src/components/` - React components (UI in `ui/` subdirectory)
- `src/trpc/` - tRPC setup (`init.ts`, `client.tsx`, `server.ts`)
- `src/trpc/routers/` - tRPC routers (`_app.ts`, `game.ts`, `spotify.ts`)
- `src/db/` - Drizzle ORM setup and schema
- `src/lib/` - Auth config, utilities, game events
- `src/hooks/` - Custom React hooks
- `src/mocks/` - MSW mocks for testing

### Key Patterns

**tRPC**: Main API layer with type-safe procedures

- `baseProcedure` - Public routes
- `protectedProcedure` - Requires authenticated session
- Game state updates use SSE subscriptions (`onSessionUpdate`)

**Real-time Updates**: tRPC subscriptions with EventEmitter fallback

- `useGameSession` hook manages subscription + polling fallback
- `emitSessionUpdate(pin)` broadcasts changes to connected clients

**Database Schema** (`src/db/schema.ts`):

- `user`, `session`, `account`, `verification` - Better Auth tables
- `gameSessions` - Game rooms with settings, turn state, playlist
- `players` - Players in a game session
- `turns` - Turn history for stats
- `gameHistory` - Completed game records

**Game Flow**:

1. Host creates game (gets 4-char PIN)
2. Players join via PIN (lobby state)
3. Host starts game → shuffles turns, assigns initial songs
4. Turn loop: play song → player places → steal phase → resolve
5. First to X songs wins

### Environment Variables

See `.env.example`. Key variables:

- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth encryption (min 32 chars)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` - Spotify OAuth
- `NEXT_PUBLIC_APP_URL` - Base URL for callbacks

### Testing

Uses MSW for API mocking. Setup in `vitest.setup.ts` starts mock server.

- Unit tests: `src/**/__tests__/*.test.{ts,tsx}`
- E2E tests: `e2e/` directory with Playwright

### Docker Support

- `docker-compose.yml` - Local dev with PostgreSQL (port 5433)
- `docker-compose.prod.yml` - Production setup
- `Dockerfile` - Production build

### Playwright MCP Auth

For automated testing with Spotify auth (ralph loop):

1. Start dev server: `bun dev`
2. Export auth: `bun auth:export` - browser opens, log in with Spotify, press Enter
3. Auth state saved to `.auth/storage-state.json`
4. Playwright MCP configured via `.mcp.json` to load this state

**IMPORTANT**: Always use `http://127.0.0.1:3000` not `http://localhost:3000` when navigating with Playwright MCP. Spotify OAuth only allows loopback IP, and session cookies are bound to `127.0.0.1`.

Re-run `bun auth:export` weekly when session expires.

## Component Standards

**Always check [shadcn/ui](https://ui.shadcn.com/docs/components) before building custom components.**

### Adding shadcn Components

```bash
bunx --bun shadcn@latest add <component>
```

### Currently Installed

- **Button** - Primary actions, variants: default, destructive, outline, secondary, ghost, link
- **Card** - Content containers with optional interactive prop
- **Input** - Text inputs with consistent styling
- **Label** - Form labels
- **Form** - React Hook Form integration
- **Table** - Data tables
- **Switch** - Toggle switches
- **Skeleton** - Loading placeholders with shimmer animation
- **Chart** - Recharts-based charting (area, bar, etc.)

### Toast Notifications

Uses `sonner` directly (not shadcn wrapper). Import and use:

```tsx
import { toast } from "sonner";

toast.success("Settings saved");
toast.error("Something went wrong");
toast.info("Information message");
```

Toaster configured in `src/app/layout.tsx` with custom icons.

### When to Build Custom

Only build custom components when:
- No shadcn equivalent exists
- App-specific logic is tightly coupled (e.g., TimelineDropZone, SpotifyPlayer)
- Significant customization beyond shadcn's capabilities needed

Keep custom components in `src/components/`, shadcn primitives in `src/components/ui/`.
