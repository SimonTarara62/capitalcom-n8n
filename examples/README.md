# Example workflows

Import these in n8n via **Workflows → Import from File**, then open each Capital.com
node and select **your own** `Capital.com (Unofficial) API` credential (the exported
JSON ships a placeholder id, never real keys).

| File | What it shows |
| --- | --- |
| `market-data-fetch.json` | Search a market, then fetch its details (read-only). |
| `guarded-position-open.json` | Open a position with **Dry Run ON** — validates the request **without sending it** — plus the Max Size and Allowed-EPIC guards. Flipping Dry Run off is what places a real order. |
| `price-alert-trigger.json` | Stream live prices via the Trigger and branch on a threshold. |

> Use a **demo** account. See the repo [DISCLAIMER](../DISCLAIMER.md).
