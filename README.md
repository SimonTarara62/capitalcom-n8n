# n8n-nodes-capitalcom

> **🧪 Beta.** Stable and in real use. **Zero runtime dependencies**, and requires
> **Node.js ≥ 24** (matching n8n's own requirement) — see
> [Installation](#installation) and [Compatibility](#compatibility).
> It's still `0.x`, so node parameters may change between minor versions — pin a version
> if you need stability. Trades real money: use a **demo** Capital.com account first, and
> please [report issues](https://github.com/SimonTarara62/capitalcom-n8n/issues).
>
> **Unofficial.** Independent community project — not affiliated with, endorsed by, or
> supported by Capital.com.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-capitalcom.svg)](https://www.npmjs.com/package/n8n-nodes-capitalcom) [![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-capitalcom.svg)](https://www.npmjs.com/package/n8n-nodes-capitalcom) [![node](https://img.shields.io/node/v/n8n-nodes-capitalcom.svg)](#compatibility) [![runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](#compatibility) [![n8n verified community node](https://img.shields.io/badge/n8n-verified%20community%20node-EA4B71.svg)](#installation) [![status: beta](https://img.shields.io/badge/status-beta-blue.svg)](#installation) [![CI](https://github.com/SimonTarara62/capitalcom-n8n/actions/workflows/ci.yml/badge.svg)](https://github.com/SimonTarara62/capitalcom-n8n/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An [n8n](https://n8n.io) community node for the **Capital.com Open API** — market data,
accounts, watchlists, and trading (positions & working orders), plus a WebSocket **Trigger**
for live price and candle streams.

It mirrors the functional surface of the
[capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli) (a Python CLI/SDK for the
same API), reimplemented natively in TypeScript for n8n. Need the same capabilities outside
n8n? See that project.

## Highlights

- **Full API coverage** — Session, Market, Account, Watchlist, Position, Order, and
  Confirmation, plus a WebSocket Trigger for live prices and candles.
- **Safe by default** — Dry Run is on out of the box, with Max Size and Allowed-EPIC
  guards enforced before any order is sent.
- **Reliable sessions** — automatic login, token caching, refresh, and rate-limit handling.
- **Proven against the live demo API** — an opt-in integration suite exercises the real
  Capital.com demo endpoints (including a live WebSocket quote).

## Maintained & open to contributions

I use this node against the live Capital.com API and keep it current as the API
evolves. It's MIT-licensed and the source is public — **issues and pull requests are
welcome**. See [CONTRIBUTING](./CONTRIBUTING.md) and start a thread in
[Discussions](https://github.com/SimonTarara62/capitalcom-n8n/discussions) — or say hello in the
[n8n community forum thread](https://community.n8n.io/t/community-node-capital-com-unofficial-trading-market-data-live-streaming/301857).

## Example workflows

Ready-to-import workflows live in [`examples/`](./examples) — market data, a guarded
(Dry-Run) position open, and a live price-alert Trigger.

**The Capital.com (Unofficial) node in the n8n editor:**

![The Capital.com (Unofficial) node in the n8n editor](https://raw.githubusercontent.com/SimonTarara62/capitalcom-n8n/main/docs/images/node.png)

**An example workflow built with the node:**

![An example workflow built with the Capital.com (Unofficial) node](https://raw.githubusercontent.com/SimonTarara62/capitalcom-n8n/main/docs/images/workflow.png)

## Installation

> **Beta (`0.x`):** node parameters may still change between minor versions.
> Pin an exact version (`npm install n8n-nodes-capitalcom@<version>`) if you need
> stability between updates — see
> [Releases](https://github.com/SimonTarara62/capitalcom-n8n/releases) for the current one.
>
> **Requires Node.js ≥ 24** (matching n8n's own requirement) — see
> [Compatibility](#compatibility).

**From the n8n editor (recommended):** this is a **verified community node**, so on an
up-to-date n8n you can open the nodes panel, search for **Capital.com (Unofficial)**, and
install it from there. Verification means n8n reviewed the package; it is still an
unofficial community project, not a Capital.com or n8n product.

**Community Nodes (self-hosted n8n):** Settings → Community Nodes → Install, enter
`n8n-nodes-capitalcom`, and confirm. Restart n8n if prompted.

**Manual:** in your n8n custom-nodes directory (`~/.n8n/custom`):

```bash
npm install n8n-nodes-capitalcom
```

This installs the current `latest`, which requires n8n running on Node.js ≥ 24.

## Credentials

Create an API key in your Capital.com account settings, then add a **Capital.com API**
credential in n8n:

| Field           | Notes                                   |
| --------------- | --------------------------------------- |
| **Environment** | `demo` or `live`                        |
| **API Key**     | the API key from Capital.com            |
| **Identifier**  | your Capital.com login email            |
| **Password**    | the custom password set for the API key |

Use the credential's **Test** button to confirm the keys log in. Sessions are cached and
refreshed automatically.

## Nodes

### Capital.com (action node)

| Resource            | Operations                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Session**         | Get Details · Get Server Time · Ping · Switch Account                                           |
| **Market**          | Search · Get · Get Prices · Get Sentiment · Navigation Root · Navigation Node                   |
| **Account**         | List · Get Preferences · Set Preferences · Activity History · Transaction History · Demo Top-Up |
| **Watchlist**       | List · Get · Create · Add Market · Remove Market · Delete                                       |
| **Position**        | List · Get · Preview · Open · Amend · Close                                                     |
| **Order** (working) | List · Preview · Create · Amend · Cancel                                                        |
| **Confirmation**    | Get · Wait For                                                                                  |

### Capital.com Trigger (streaming node)

Streams live market data over WebSocket, emitting one execution per message:

- **Prices** — live quotes/ticks for the given EPICs
- **Candles** — OHLC updates for the given EPICs + resolutions

The connection authenticates, keeps itself alive, and reconnects automatically on drops.

## Quickstart

A safe first workflow:

1. Add a **Capital.com** node, select your **Capital.com API** credential (on `demo`).
2. **Market → Search** for an instrument (e.g. `gold`) and note an `epic`.
3. **Position → Open** with that epic, a direction, and size — leave **Dry Run** on.
   The node returns the request it _would_ send, without trading.
4. Happy with it? Turn **Dry Run** off to place the demo order, then use
   **Confirmation → Wait For** on the returned `dealReference`, and **Position → Close**
   to flatten.

For live streaming, add a **Capital.com Trigger**, choose **Prices**, and set the EPICs.

## Trading safety

Position **Open** and Order **Create** expose safety controls as node parameters:

- **Dry Run** — _defaults ON_. Returns the would-be request without sending it. **Turn it off
  to place real orders.**
- **Max Size Guard** — rejects the order if size exceeds this (0 disables).
- **Allowed EPICs** — comma-separated allow-list; empty allows any EPIC.

**Preview** operations never send. Start on the `demo` environment.

## Compatibility

Tested against the Capital.com Open API on the `demo` environment.

**Zero runtime dependencies.** Capital.com authenticates every WebSocket message, not
just the handshake — `cst` and `securityToken` travel inside the subscribe and ping
payloads themselves (see `transport/wsProtocol.ts`). That means no connection headers
are needed, so the Trigger streams over Node's native global `WebSocket` instead of a
third-party client, and `package.json` carries no `dependencies` at all. Validated with
a 16-minute soak against the Capital.com demo API: 2,432 BTCUSD quotes streamed, the
connection survived its 8-minute keep-alive ping, and it reconnected cleanly after a
forced disconnect. Requires Node.js ≥ 24 (see [Installation](#installation)).

## Resources

- [Capital.com Open API docs](https://open-api.capital.com/)
- [capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli) — the sibling Python CLI/SDK
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)

## Contributing & community

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Please follow the
[Code of Conduct](./CODE_OF_CONDUCT.md), report vulnerabilities per the
[Security Policy](./SECURITY.md), and check the [CHANGELOG](./CHANGELOG.md) for what's new.

## Disclaimer

Unofficial and independent — not affiliated with, endorsed by, or supported by
Capital.com. **Not financial advice.** CFD trading carries a high risk of losing
money rapidly. Use a demo account until you fully trust your setup; you are
responsible for any trades placed with your credentials.

## License

[MIT](./LICENSE) © 2026 Simon Tarara. See [DISCLAIMER](./DISCLAIMER.md) for the
unofficial-affiliation and financial-risk notice.
