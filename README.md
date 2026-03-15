# OneShot

**Shared whiteboard for humans and AI agents.**
Open a canvas, share the URL, and draw together — or let your AI agent write directly to the canvas while you watch it happen in real time.

```bash
npx oneshot
```

---

## What it does

`npx oneshot` starts a session in your terminal:
- Creates a shared room with a unique URL
- Opens the canvas in your browser
- Gives your AI agent (Claude Code, Cursor, etc.) instructions to draw on the canvas by editing `canvas.json`
- Every change syncs live across all connected browsers

---

## Quick start

```bash
# Start a session
npx oneshot

# You'll see:
#   ◆ Room ready
#   ↗ https://oneshot.app/r/abc123
#   ✦ Instructions written to AGENT.md
```

Share the URL with teammates. Point your AI agent at `AGENT.md` — it explains exactly how to draw on the canvas.

---

## How it works

```
terminal (npx oneshot)
    │
    ├── watches canvas.json (local file)
    ├── syncs changes via Ably/Supabase
    │
    └──▶ browser (oneshot.app)
              real-time canvas
```

The AI agent edits `canvas.json`. The CLI detects the change and pushes it to the room. All browsers update within ~1 second.

---

## AI agent setup

When you run `npx oneshot`, it writes an `AGENT.md` file to your project root. This file tells your AI agent:
- The canvas file format
- How to add, modify, and delete elements
- How to connect shapes with arrows
- Best practices for collaborating without overwriting human work

Supported agents: **Claude Code**, **Cursor**, **Aider**, any tool that can read/write files.

---

## Self-hosting

```bash
git clone https://github.com/thesekron/oneshot
cd oneshot
cp .env.example .env  # add your Ably or Supabase keys
yarn install
yarn dev
```

The web app runs on port `3000`. See `.env.example` for all required variables.

---

## Contributing

```bash
yarn install
yarn test:typecheck   # type check
yarn test:update      # run tests
yarn fix              # lint + format
```

---

## License

MIT
