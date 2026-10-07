# Guildhall web app

A Vue 3 + Vite front end for the [Guildhall](https://onyx.testnets.gno.land/r/g1lnkytfqcjwllws63gvf0mv9yt04aswy4y9amhm/guildhall)
realms on the gno.land Onyx testnet. It has no backend: it reads straight from
a gno.land node over RPC and signs with the [Adena](https://adena.app) wallet.

Live at <https://clockworkgr.github.io/guildhall-web/>.

## Run it

```sh
npm install
npm run dev       # http://localhost:5173, pointed at a local gnodev node
```

The local node is gnodev running the Guildhall realms (`make dev` in the realms
repository). To work against Onyx instead, run `npm run dev -- --mode production`.

`npm run build` typechecks and writes a static site to `dist/`. Set
`BASE_PATH` when serving from a subpath (`BASE_PATH=/guildhall-web/ npm run build`).
Because the app uses history-mode routing, the host must serve `index.html` for
unknown paths (Netlify `_redirects`, Vercel rewrites, nginx `try_files`, …).

## Deployment

`.github/workflows/pages.yml` builds with `BASE_PATH=/guildhall-web/` on every
push to `main` and publishes `dist/` to GitHub Pages. It copies `index.html` to
`404.html` so that deep links such as `/bounty/3` load the app.

## Configuration

Build-time defaults live in `.env.development` (local gnodev) and
`.env.production` (Onyx testnet, `onyx-1`):

| Variable | Meaning |
|---|---|
| `VITE_RPC_URL` | node RPC endpoint |
| `VITE_CHAIN_ID` | chain ID Adena must be on |
| `VITE_GNOWEB_URL` | gnoweb base, for "view on gno.land" links |
| `VITE_REALM_ROOT` | `gno.land/r/<namespace>/guildhall` |

Visitors can also point the app at
another node from the globe menu; that choice is kept in their browser only.

## How it talks to the chain

- **Reads**: each realm's `Render("api/...")` returns JSON, fetched with
  `vm/qrender` (`src/lib/rpc.ts`, `src/lib/api.ts`). The endpoints are listed
  at the top of the realms' `bounties/api.gno` and `reputation/api.gno`.
- **Writes**: `MsgCall` transactions signed in Adena (`src/lib/adena.ts`).
  Several calls can go in one transaction; posting a GRC20 bounty sends the
  token realm's `Approve` and `PostBountyGRC20` together, so it lands or fails
  as a whole. This assumes the token realm exports the usual
  `Approve(spender, amount)`.
- Panics from the realm are shown to the user as-is, so the realms' error
  messages are the app's error messages.

## Layout

```
src/lib/          config, RPC client, typed API, Adena, formatting, hallmarks
src/composables/  wallet state, data loading, transactions, token metadata
src/components/   Hallmark, ledger rows, addresses, amounts, markdown …
src/pages/        home, board, bounty, post, contributors, profile, record, how, guild settings
```

## Browser tests

The Playwright suite exercises the Vue app in Chromium, Firefox, WebKit, and
mobile Chromium. It intercepts the real JSON-RPC transport and injects an Adena
fixture; no node, extension, keys, or funds are needed, and no transactions are
broadcast. Fixtures are isolated per test. The suite covers:

- Every route, navigation, board status/tag filters, browser history, pagination,
  contributor profiles, work/review tabs, records, and missing entities.
- Wallet installation, connection errors, restoration, account/network changes,
  disconnect, pending transactions, rejection, and realm errors.
- Native and GRC20 posting (including atomic token approval), validation, markdown
  preview, milestones, reviewers, quorum, arbitration, and paused posting.
- Applications, direct/applicant assignment, submission, changes, resubmission,
  reviewer quorum, disputes, partial/default payouts, cancellation, unassignment,
  work windows, and role restrictions.
- Seed management, record voiding, posting pause/resume, and council transfer.
- Loading, empty, failed RPC, malformed API responses, retry, unsafe content,
  keyboard access, mobile navigation, overflow, and WCAG AA checks with axe.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run test:e2e                # all four browser projects
npm run test:e2e -- --project=chromium
npm run test:e2e:ui             # interactive runner
npm run test:e2e:report         # inspect the last HTML report
npm run typecheck:e2e           # typecheck test code and configuration
```

Playwright starts Vite on `127.0.0.1:4173` with a test chain. Keep that port free
when running tests; an already-running server is reused outside CI. Failure
artifacts include screenshots, video, and traces. Set `CAPTURE_UI=1` to attach
full-page screenshots for every view to the report. Generated reports and
artifacts are ignored by Git.

`.github/workflows/test.yml` builds and runs the suite on pushes and pull requests
that affect the frontend, and uploads the reports. These browser tests verify
frontend behavior and signed transaction payloads against controlled fixtures;
they do not replace the realms' `make test` for realm rules or a real Adena/gnodev integration
check before a release.

## Interface

The app uses a shared responsive workspace shell, an emerald accent, locally
bundled fonts, accessible focus styles, and a persisted light/dark theme. Desktop
navigation is always visible; mobile navigation opens a keyboard-contained drawer.
Network settings use a native modal dialog. Public reads do not require a wallet.
