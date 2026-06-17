# Security Policy

## Supported versions

This project is pre-1.0; only the latest release on `main` receives security fixes.

## Reporting a vulnerability

Please report suspected vulnerabilities privately using GitHub's
[private vulnerability reporting](https://github.com/SimonTarara62/capitalcom-n8n/security/advisories/new)
(Security tab → "Report a vulnerability"). Do not open a public issue for security
problems.

Include a description, reproduction steps, and the impact you observed. You can
expect an initial response within a few days.

## How credentials are handled

In production, your Capital.com API key, identifier, and password are stored in
**n8n's encrypted credential store** — never in a file in this project. The node
sends them only to Capital.com over HTTPS to log in. The short-lived session
tokens (CST / X-SECURITY-TOKEN, valid ≤ 10 minutes) are cached in the workflow's
static data so back-to-back executions reuse one login instead of re-authenticating
(which trips Capital.com's login-rate limit). Those are session tokens, **not**
your API key or password — the key and password are never written to static data.

A local `.env` is used **only** by the optional developer integration tests, and
it is gitignored. Never paste credentials, `.env` contents, or a credential's
values into issues, logs, screenshots, or pull requests.

## Trading safely

- **Your API key is trading-capable.** Capital.com API keys can open and close
  real trades. Treat the key like a password.
- **Start on demo.** The credential has a `demo`/`live` switch; keep it on `demo`
  until you fully trust your setup.
- **Dry Run defaults ON.** A freshly-added Open Position / Create Order node
  returns the would-be request without trading until you explicitly turn Dry Run
  off. **Preview** operations never send.
- **Use the guards.** Set the **Max Size Guard** and **Allowed EPICs** node
  parameters to cap what a workflow can do — they're enforced before any order
  is sent.
- **Least-privilege keys.** Use a demo key while building. For live use, scope
  the key as tightly as the broker allows — Capital.com supports an **IP
  allowlist** on API keys, and you can cap the funded amount on the account the
  key trades. A leaked key should be able to do as little as possible.

## AI-driven workflows

n8n workflows can be driven by AI agents. If an agent can edit or run a workflow
that holds this credential, it can trade with it. Secrecy from such an agent is
not an achievable goal; **damage limitation** is — keep the credential on demo,
keep Dry Run on, set the size/EPIC guards tightly, and use a least-privilege,
IP-allowlisted key for any live use.

## No financial advice

This is an unofficial tool. Nothing it outputs is financial advice. CFD trading
carries a high risk of losing money rapidly. Use at your own risk.
