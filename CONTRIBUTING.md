# Contributing

Thanks for considering a contribution! This is an independent, unofficial n8n
community node for the Capital.com Open API. Bug reports, fixes, and new
operations are all welcome.

New here? Browse issues labelled `good first issue`, or open a Discussion if
you're unsure where to start.

## Development setup

```bash
git clone https://github.com/SimonTarara62/capitalcom-n8n.git
cd capitalcom-n8n
npm install
npm run build
```

Requires Node.js ≥ 20.15 (the version n8n runs on).

## Checks to run before a PR

```bash
npm run build            # tsc + icon copy
npx tsc --noEmit         # full type-check
npm run lint:prepublish  # the strict lint the package publishes under
npm test                 # unit tests (offline, no credentials needed)
```

All four must pass. `npm test` is fully offline — it uses injected fakes, so no
Capital.com account is needed.

## Optional: live integration tests (demo only)

There's an opt-in suite that exercises the real Capital.com **demo** API:

```bash
cp .env.example .env     # then fill in DEMO API keys (never live, never commit)
npm run test:integration
```

It logs in, reads markets/accounts, round-trips a watchlist, opens and closes a
minimum-size demo position, and receives a live WebSocket quote. `.env` is
gitignored; the loader hard-codes the `demo` environment so these tests can
never touch live. Without `.env`, the suite skips cleanly.

## Project layout

- `transport/` — the node-agnostic Capital.com client: REST client, session +
  token caching, rate limiter, error mapping, and the pure WebSocket protocol
  (`wsProtocol.ts`). **No n8n imports here** — it's testable with plain fakes.
- `nodes/CapitalCom/` — the action node. `transport.ts` adapts the client to n8n
  (`httpRequest` → requester, `workflowStaticData` → session store); `safety.ts`
  and `tradeBody.ts` are shared helpers; each resource is a module under
  `actions/` exporting `{ <r>Operations, <r>Fields, execute<R>(client, ctx, i) }`.
- `nodes/CapitalComTrigger/` — the WebSocket Trigger node (Prices / Candles).
- `credentials/` — the `CapitalComApi` credential (auth only).
- `tests/` — unit tests (offline) and `tests/integration/` (opt-in, live demo).

## Conventions

- **TDD.** Add a failing test, then the code. Behaviour gets a test.
- **Keep `transport/` n8n-free.** It depends only on its injected `Requester` /
  `SessionStore` / `Clock` (and `ws` for streaming). Anything n8n-specific lives
  under `nodes/` or `credentials/`.
- **Follow the resource-module pattern** when adding operations — one `actions/<resource>.ts`
  with its operation dropdown, fields, and a small `execute` dispatcher.
- **Safety stays in node params.** Trading guards (Dry Run, Max Size, Allowed
  EPICs) are node fields enforced before any order is sent; Dry Run defaults ON.
- n8n lint conventions: operation options alphabetized, `noDataExpression` on
  resource/operation, masked secret fields. `npm run lintfix` handles most of it.
- Keep PRs focused; never include credentials, secrets, or `.env` contents.

By contributing you agree your work is licensed under the project's
[Apache-2.0](./LICENSE) license.
