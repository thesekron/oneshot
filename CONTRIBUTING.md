# Contributing to OneShot

## Prerequisites

- Node.js 18+
- Yarn 1.22+

## Local Development

```bash
# 1. Install all dependencies (monorepo root)
yarn install

# 2. Build utility packages in the correct order
yarn build:packages   # common → math → element → excalidraw

# 3. Start the dev server (http://localhost:3001)
yarn start
```

> You only need to run `yarn build:packages` once, or after changing anything inside `packages/`.

## Project Structure

```
app/              Web application (React + Vite)
packages/
  cli/            CLI tool (npx oneshot-app)
  common/         Shared constants and utilities
  element/        Element manipulation library
  excalidraw/     Core drawing engine (Excalidraw fork)
  math/           Geometric math utilities
server/           Optional self-hosted Socket.io relay
```

## Testing the Full Sync Flow

1. Set up a free [Supabase](https://supabase.com) project and run the SQL schema from `.env.example`
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Start the dev server: `yarn start`
4. In a separate terminal: `cd packages/cli && npx ts-node src/index.ts start`
5. Open the URL printed by the CLI in your browser

## Running Tests

```bash
yarn test:all        # TypeScript + ESLint + Prettier + unit tests
yarn test:app        # Unit tests only (watch mode)
yarn test:typecheck  # TypeScript only
yarn fix             # Auto-fix lint and formatting issues
```

## Packages Build Order

If you change anything in `packages/`, rebuild in this order:

1. `packages/common`
2. `packages/math`
3. `packages/element`
4. `packages/excalidraw`

Or just run `yarn build:packages` which handles the order automatically.

## CLI Development

```bash
cd packages/cli
npm install
npm run build       # compiles TypeScript to dist/
node dist/index.js  # run locally
```

## Environment Variables

See `.env.example` for all available variables and the required Supabase SQL schema.
