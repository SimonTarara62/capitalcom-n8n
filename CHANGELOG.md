# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.1] - 2026-09-20

### Changed

- `author.email` now uses a deliverable address so the n8n Creator Portal can send its
  ownership-verification token. The previous GitHub `noreply` alias cannot receive mail.
  This address was already published in the package's npm maintainer record.

## [0.3.0] - 2026-09-20 — Beta

### Breaking changes

- **Node.js 24 is now required** (`engines.node >= 24.0.0`), matching n8n's own
  requirement.
- The **Watchlist** and **Account** ID fields are now resource locators — pick from a
  live list or enter an ID manually. Saved workflows may need these fields re-selected.
- The new **Simplify** option defaults to **on**, following n8n's convention. Positions,
  Working Orders, Market search/get and Transaction History now return a simplified
  response unless you switch Simplify off.

### Changed

- **Zero runtime dependencies.** The `ws` package is gone and `package.json` no longer
  has a `dependencies` key at all — the WebSocket Trigger now uses Node's native
  `WebSocket`. Capital.com authenticates every stream message, not just the handshake,
  so no connection headers are needed. Validated live: a 16-minute soak against the
  Capital.com demo API streamed 2,432 BTCUSD quotes, survived the connection's 8-minute
  keep-alive ping, and reconnected cleanly after a forced disconnect.

### Fixed

- Trigger teardown is now deterministic: an `AbortController` owns the socket, the ping
  loop and the reconnect backoff, so deactivating a workflow can no longer leave a live
  broker connection running.
- Socket errors now report the underlying cause, and close events log their code and
  reason.
- Errors now say what happened and which field to change. Tripping your own **Max Size
  Guard** or **Allowed EPICs** list is reported as a configuration issue rather than as
  a broker API failure, which is what previously happened.

### UX

- Listing operations are named **Get Many** instead of *List*. Internal operation values
  are unchanged, so existing workflows keep working.
- Delete-shaped operations now return `{ "deleted": true }`. Closing a position also
  keeps the response body, because it carries the `dealReference` needed for
  confirmation polling.
- Actionable `NodeOperationError` messages throughout, instead of raw API errors.
- Themed light/dark icon variants for both nodes and the credential.

### Packaging

- Releases are now published by GitHub Actions with an **npm provenance** attestation
  via OIDC trusted publishing. No publish tokens are used.
- `usableAsTool` is explicitly **`false`**. This node can place real orders, so it is
  not exposed to AI Agents by default.
- README screenshots are no longer bundled into the published package — it drops from
  ~897 kB to ~187 kB unpacked.

## [0.2.0] - 2026-07-02 — Beta

### Changed

- **Relicensed from Apache-2.0 to MIT** (© 2026 Simon Tarara). Removed the `NOTICE`
  file; its unofficial-affiliation clause now lives in `DISCLAIMER.md`.
- Repositioned from Alpha to **Beta**: stable and in real use; still `0.x` so node
  parameters may change between minor versions. Financial-risk and demo-first
  disclaimers unchanged.

### Added

- `DISCLAIMER.md` (unofficial + financial-risk + not-financial-advice).
- Importable example workflows under `examples/`.
- "Maintained & open to contributions" note; contributions are welcome.

## [0.1.1] - 2026-06-17 — Alpha

### Added

- "Unofficial" now appears in the node and credential names shown in the n8n editor
  (Capital.com (Unofficial), Capital.com (Unofficial) Trigger, Capital.com (Unofficial) API).
- A top-of-panel "unofficial — not affiliated with Capital.com" notice on the action node,
  the trigger node, and the credential, plus documentation links on both nodes.

## [0.1.0] - 2026-06-16 — Alpha

Initial public alpha. In active development — operations, parameters, and defaults may
change between `0.x` versions. Use a demo account.

### Added

- **Capital.com** action node with seven resources: Session, Market, Account, Watchlist,
  Position, Order, and Confirmation — full coverage of the Capital.com Open API request/response
  surface.
- **Capital.com Trigger** node streaming live Prices (quotes) and Candles (OHLC) over WebSocket,
  with keep-alive ping and automatic reconnect.
- **Capital.com API** credential (API key, identifier, password, demo/live) with a live login test.
- Trading safety controls as node parameters: **Dry Run** (defaults ON), **Max Size Guard**, and
  **Allowed EPICs**, enforced before any order is sent. **Preview** operations never send.
- Automatic session caching and refresh; client-side rate limiting; readable API error mapping.
