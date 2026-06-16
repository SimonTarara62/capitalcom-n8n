# n8n-nodes-capitalcom

> **Unofficial.** This is an independent community project and is not affiliated
> with, endorsed by, or supported by Capital.com.

An [n8n](https://n8n.io) community node for the **Capital.com Open API** —
market data, accounts, watchlists, trading (positions & working orders), and
WebSocket streaming.

It mirrors the functional surface of the
[capitalcom-cli](https://github.com/SimonTarara62/capitalcom-cli) (a Python
CLI/SDK for the same API), reimplemented natively in TypeScript for n8n. If you
need the same capabilities outside n8n, see that project.

## Status

Early development. See the implementation milestones.

## Installation

_Will be documented once published to npm._

## Credentials

You need a Capital.com API key (create one in your Capital.com account settings):

- **API Key**
- **Identifier** (your login email)
- **Password** (the custom password set for the API key)
- **Environment** (`demo` or `live`)

## Operations

_Documented per resource as milestones land (Session, Market, Account,
Watchlist, Position, Order, Confirmation, plus a streaming Trigger node)._

## License

[Apache-2.0](./LICENSE)
