# n8n-nodes-capitalcom

> **Unofficial.** Independent community project — not affiliated with, endorsed by, or
> supported by Capital.com.

[![CI](https://github.com/SimonTarara62/capitalcom-n8n/actions/workflows/ci.yml/badge.svg)](https://github.com/SimonTarara62/capitalcom-n8n/actions/workflows/ci.yml)

An [n8n](https://n8n.io) community node for the **Capital.com Open API** — market data,
accounts, watchlists, and trading (positions & working orders), plus a WebSocket **Trigger**
for live price and candle streams.

It mirrors the functional surface of the
[capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli) (a Python CLI/SDK for the
same API), reimplemented natively in TypeScript for n8n. Need the same capabilities outside
n8n? See that project.

## Installation

**Community Nodes (self-hosted n8n):** Settings → Community Nodes → Install, enter
`n8n-nodes-capitalcom`, and confirm. Restart n8n if prompted.

**Manual:** in your n8n custom-nodes directory (`~/.n8n/custom`):

```bash
npm install n8n-nodes-capitalcom
```

Requires n8n with Node.js ≥ 20.15.

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

## Trading safety

Position **Open** and Order **Create** expose safety controls as node parameters:

- **Dry Run** — _defaults ON_. Returns the would-be request without sending it. **Turn it off
  to place real orders.**
- **Max Size Guard** — rejects the order if size exceeds this (0 disables).
- **Allowed EPICs** — comma-separated allow-list; empty allows any EPIC.

**Preview** operations never send. Start on the `demo` environment.

## Compatibility

Tested against the Capital.com Open API on the `demo` environment. WebSocket streaming
requires connection headers, so the node depends on the `ws` package.

## Resources

- [Capital.com Open API docs](https://open-api.capital.com/)
- [capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli) — the sibling Python CLI/SDK
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

[Apache-2.0](./LICENSE). See [NOTICE](./NOTICE).
