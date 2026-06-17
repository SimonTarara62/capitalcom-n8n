# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
