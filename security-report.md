# Security audit — Clock Wall — 2026-09-11

**Verdict:** SHIP — no exploitable vulnerability found; the one real gap (no security
response headers) is fixed in this same change.
**Production-audit score:** not scored — most ECC production-audit criteria (webhooks,
migrations, rollback, health checks) address stateful backends this app does not have.

## Scope

- **Stack:** React 19 + TypeScript, Webpack 5, hand-written CSS, Luxon, @dnd-kit,
  framer-motion, Radix primitives. Static SPA.
- **Backend surface:** none. No API, no database, no auth, no serverless functions,
  no secrets. All state lives in `localStorage` under `clockwall:v1`.
- **Deployed:** Vercel static hosting, `clockwall-mine.vercel.app`.
- **AI/agent feature:** none → ECC `agent-architecture-audit` **not run** (N/A).
- **Dynamic pentest:** not part of this pass (static review only).

### Layers audited

| Layer | Status | Notes |
|---|---|---|
| 0 — Harness config | clean | `.claude/` holds only `launch.json`; no `.mcp.json`; no hooks or custom agents |
| 1 — Front-end | clean | No XSS sinks; React escaping intact |
| 2 — APIs | N/A | No API layer |
| 3 — Database | N/A | `localStorage` only |
| 4 — Auth | N/A | No accounts, no sessions, no tokens |
| 5 — Hosting | **fixed** | No security headers were served; added in `vercel.json` |
| 6 — Cloud infra | N/A | Static hosting only |
| 7 — CI/CD | clean | Vercel builds from GitHub on push; no secrets in the repo |
| 8 — RLS | N/A | No database |
| 9 — Rate limiting | N/A | No server endpoints |
| 10 — Caching/CDN | **improved** | Added immutable caching for content-hashed `/assets/*` |
| 11 — Scaling | N/A | Static assets |
| 12 — Logging | N/A | No server-side logging; no PII collected |
| 13 — Recovery | clean | Export/import is the backup path; import is validated (below) |

## Findings by severity

### Critical
None.

### High
None.

### Medium
None.

### Low

**L1 — No security response headers (FIXED in this change).**
`vercel.json` served no `Content-Security-Policy`, `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options` or `Permissions-Policy`. For a site with no
XSS sink today this is defence-in-depth rather than an active hole, but it is the
single highest-value hardening available to a static app.

Added a CSP that is tight everywhere it can be:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'
```

**`style-src 'unsafe-inline'` is a deliberate, documented relaxation.** The build
uses `style-loader`, which injects the stylesheet as runtime `<style>` elements,
and the drag system writes inline `style="transform: ..."` on every tile. Removing
it would require switching to `mini-css-extract-plugin` *and* moving all drag
transforms to CSS custom properties. `script-src` stays free of `unsafe-inline`,
which is the directive that actually stops injected script.

Verified before shipping: the built `dist/` was served locally with these exact
headers — the app mounted, all tiles rendered, the 6 injected `<style>` tags were
allowed, Manrope loaded and applied, and **zero `securitypolicyviolation` events
fired**.

### Informational

**I1 — 13 known advisories in the dependency tree, none reachable in production.**
`npm audit` reports 8 moderate / 5 high across `webpack-dev-server`, `browserslist`,
`postcss`, `express`, `shell-quote`, `qs`, `nanoid`, `uuid`, `sockjs`,
`http-proxy-middleware`, `body-parser`, `fast-uri`, `baseline-browser-mapping`.
All are build- or dev-server-only; the deployed artifact is static HTML/JS/CSS and
contains none of them. `npm audit fix` cannot resolve them within the current
semver ranges — clearing them needs `npm audit fix --force`, which would take major
version bumps of `webpack-dev-server` and could break local development. Judged not
worth it for code that never ships. Revisit if the dev server is ever exposed
beyond localhost.

**I2 — Imported timezone strings are not validated as real IANA zones.**
`sanitizeImportedClock` checks `typeof clock.timezone === "string"` but not that the
zone exists, so a hand-edited deck could carry a bogus zone into Luxon. Impact is a
render error in the user's own browser from a file they chose themselves — not a
security boundary. Noted rather than fixed.

## What was checked and found sound

- **Import trust boundary** (`parseImportedDeck` / `sanitizeImportedClock`,
  `src/hooks/useAppState.ts`). Rejects anything without `app === "clockwall"` and
  `version === 1`, requires `board.name` to be a string and `board.clocks` an array,
  and type-checks every field of every clock, discarding unknown keys. Notably it
  **regenerates every id with `crypto.randomUUID()`**, so an imported deck cannot
  choose its own ids or collide with existing ones.
- **No XSS sinks.** `dangerouslySetInnerHTML`, `innerHTML`, `eval` and
  `new Function` do not appear anywhere in `src/`. All user-controlled strings
  (board names, location names) render as React text children and are escaped.
- **`clock.color`** survives import as a string but is never read by any component,
  so it reaches no CSS or style sink.
- **`localStorage` hydration** is wrapped in `try/catch` and shape-checked before
  use, falling back to `defaultState`.
- **Export filename** is derived from the board name through
  `.toLowerCase().replace(/[^a-z0-9]+/g, "-")`, which strips every path character —
  no traversal via `link.download`.
- **Only external origin** referenced anywhere in `src/` is
  `https://drive.google.com`, in a `target="_blank" rel="noreferrer"` link
  (`noreferrer` implies `noopener`, so no reverse tabnabbing).
- **Dev-only background tuner** is gated on
  `process.env.NODE_ENV !== "production" && location.search.includes("tune")`.
  Webpack folds this to `false` in a production build and eliminates the branch;
  confirmed empirically — `BackgroundTuner` appears 0 times in `dist/assets/*.js`.
- **Secrets hygiene.** `.gitignore` covers `.env`, `.env.*` (with `!.env.example`)
  and `.vercel`; `git ls-files` shows no tracked env, key, credential or PEM file.

## Method — and what was deliberately not run

Run: Phase 0 scoping, Phase 1 harness scan, the built-in `/security-review` on the
7-commit pending diff, `npm audit`, and a manual walk of the ECC application and
cloud-infrastructure checklists against the applicable layers.

Not run, with reasons:

- **`gstack-cso` / `gstack-review`** — skipped as redundant here. Both are deep
  review passes aimed at server-side code; this diff is CSS, drag animation and
  copy, over an app with no backend, no auth and no secrets. Running them would
  have loaded two large documents to re-derive the same empty finding set.
- **Per-finding verifier subagents** — `/security-review` asks for one subagent per
  candidate finding. `~/.claude/CLAUDE.md` forbids that pattern outright (the
  939k-token incident) and caps concurrent subagents at 2–3, so the analysis was
  done in the main window instead. That cap overrides the skill's fan-out step.
- **Dynamic pentesting** — out of scope for this pass by design.

## Fix plan

1. **Done** — security + caching headers added to `vercel.json`, CSP verified
   against the real build with no violations.
2. Optional, low priority — validate imported timezones against the generated zone
   list (I2).
3. Optional — revisit the dev-toolchain advisories (I1) only if `npm audit fix --force`
   can be absorbed without breaking the webpack dev server.
