# AGENTS.md

Orientation for anyone (human or AI assistant) working in this repo. For the full
contributor guide see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is

An unofficial n8n community node for the Capital.com Open API — a native
TypeScript reimplementation that mirrors the [capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli)
surface (functional parity only; no code dependency).

## Invariants — do not break these

- **`transport/` is node-agnostic.** No `n8n-workflow` imports there. It depends
  only on injected `Requester` / `SessionStore` / `Clock`, plus Node's native
  global `WebSocket` for streaming — no third-party WebSocket package, and
  `package.json` has no `dependencies` key at all.
- **Secrets never get committed.** `.env` is gitignored and only feeds the opt-in
  integration tests; production credentials live in n8n's encrypted store.
- **Safety stays in node params** and Dry Run defaults ON; Preview never sends.
- **Tests-first.** Add a failing test before the code; `transport/` is unit-tested
  with fakes, the live path with the opt-in demo integration suite.

## Before opening a PR

```bash
npm run build && npx tsc --noEmit && npm run lint && npm test
```

Requires Node.js ≥ 24 (see `engines` in `package.json`).

## Adding an operation

Follow the resource-module pattern: edit `nodes/CapitalCom/actions/<resource>.ts`
(operation dropdown + fields + `execute` dispatcher), wire it in the node router,
and add unit tests. Keep n8n option lists alphabetized.
