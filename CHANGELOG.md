# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
