# GrantAI — Workspace

## Overview

AI-powered grant discovery and application platform. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (glassmorphism dark theme, electric blue + emerald palette)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (ESM bundle)
- **AI**: Claude claude-sonnet-4-6 via `@workspace/integrations-anthropic-ai`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild composite libs (run after schema/API spec changes)
- `cd lib/api-spec && pnpm exec orval --config ./orval.config.ts` — regenerate API client + Zod schemas from OpenAPI spec
- `cd lib/db && pnpm exec drizzle-kit push` — push DB schema changes (dev only)

## Architecture

```
artifacts/
  api-server/     — Express API server (port 8080, path /api)
  grant-ai/       — React + Vite frontend (port $PORT, path /)
lib/
  api-spec/       — OpenAPI spec + Orval codegen config
  api-client-react/ — Generated React Query hooks
  api-zod/        — Generated Zod schemas for validation
  db/             — Drizzle ORM schema + DB client
  integrations-anthropic-ai/ — Anthropic AI client
```

## Frontend Pages

- `/` — Landing page
- `/onboard` — 5-step wizard (auto-generates AI matches after completion)
- `/dashboard` — AI-matched grants with fit scores, win probability, funding stats
- `/grants/:id` — Grant detail page
- `/applications` — Applications list
- `/applications/:id` — Application workspace with AI draft generation + inline rewrite

## AI Features

- **Grant matching** (temperature 0.3): Scores 50 grants by fit score (60–99) and win probability (5–45%)
- **Draft generation** (temperature 0.7): SSE-streamed application letter from user + grant context
- **Inline rewrite** (temperature 0.7): Select any text → floating toolbar → rewrite with 5 styles (compelling, concise, specific, formal, stronger opening)

## DB Schema

Tables: `users`, `grants`, `matches` (has `win_probability` column), `applications`

## Important Notes

- `lib/api-zod/src/index.ts` exports only from `./generated/api` (no `api.schemas` file)
- `lib/api-client-react/src/index.ts` exports only from `./generated/api` (no `api.schemas` file)
- Always run `typecheck:libs` after changing OpenAPI spec or DB schema before running package-level typechecks
- userId stored in `localStorage` key `grantai_user_id`
- Codegen command must be run from `lib/api-spec/` directory
