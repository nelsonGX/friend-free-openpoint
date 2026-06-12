# OpenPoint 代轉 (Free OpenPoint)

A small tool for friends to request **OpenPoint** top-ups. A friend logs in with
Discord (gated to our group via **Friend Group Auth**), enters the receiving phone
number, picks an amount, and pays with group credits. The admin then transfers the
OpenPoint to that phone number in the OpenPoint app and marks the request approved.
If a request is rejected, the friend's credits are refunded automatically.

**Flow:** 登入 (Discord) → 申請 (手機 + 點數) → 付款 (點數) → 待核准 → 管理員轉帳並核准 → 完成
(1 credit = 1 TWD = 1 OpenPoint, fixed.)

## Auth & payments — Friend Group Auth

This app integrates [Friend Group Auth](https://group.nelsongx.com) (Discord-gated
OAuth 2.0 + PKCE + a shared credit system). Access requires `allowed === true` from
userinfo, so only members of our Discord group can use it. The OAuth app is already
registered (see **Provider apps** in the dashboard).

### Routes

| Path                  | What it does                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `/`                   | Landing page; Discord login                                               |
| `/apply`              | Apply form (phone + amount), creates a pay intent and redirects to pay    |
| `/status`             | The signed-in user's own requests and their status                        |
| `/admin`              | Admin-only dashboard: approve (sent) or reject (refund) paid requests     |
| `/api/auth/login`     | Begins OAuth (PKCE + state)                                               |
| `/api/auth/callback`  | Exchanges code, checks `allowed`, opens a session                         |
| `/api/auth/logout`    | Clears the session                                                        |
| `/api/requests`       | Creates a request + pay intent (server-side)                              |
| `/pay/return`         | Payment return URL: verifies the payment server-side, flips state         |
| `/pay/result`         | Friendly result page after a payment                                      |
| `/api/admin/approve`  | Marks a paid request completed                                            |
| `/api/admin/reject`   | Refunds the friend (reverse pay) and marks the request rejected           |

Requests are stored in Friend Group Auth's hosted JSON store (app scope) under the
`req:` key prefix — this app has no database of its own.

## Environment

Secrets live in `.env.local` (git-ignored). The Friend Group Auth keys were written
by the integration skill; you must set the rest:

```
AUTH_BASE_URL=https://group.nelsongx.com
AUTH_CLIENT_ID=fgc_...            # written by the skill
AUTH_CLIENT_SECRET=...            # written by the skill — server-side only, never expose
AUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=...                # random; signs the session cookie
ADMIN_DISCORD_IDS=                # comma-separated Discord user IDs allowed into /admin
```

> **Set `ADMIN_DISCORD_IDS`** to your own Discord user ID (right-click your name in
> Discord → Copy User ID, with Developer Mode on). Without it, `/admin` is reachable
> by nobody. Multiple admins: `id1,id2`.

The app derives the OAuth callback and payment-return URLs from the request origin,
so the same build works on both dev and prod **as long as the origin matches a
registered redirect URI**.

### Registered redirect URIs

- `http://localhost:3000/api/auth/callback` and `http://localhost:3000/pay/return`
- `https://get-openpoint.nelsongx.com/api/auth/callback` and `https://get-openpoint.nelsongx.com/pay/return`

> **Run dev on port 3000.** OAuth only works on a registered origin; a different
> port (e.g. 3001) will be rejected with a `redirect_uri` mismatch.

## Funding refunds / payouts

Rejecting a paid request refunds the friend via Friend Group Auth **reverse pay**,
which draws from the app's balance. Keep the app balance funded (dashboard →
**Manage → Funding**, or route payment income into app balance); a low balance
returns `402 insufficient_funds` and the rejection is aborted with a message.

## Develop

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Production env vars

Set the same five env vars on your host (e.g. Vercel project settings). Use a fresh
`SESSION_SECRET`, the production `AUTH_REDIRECT_URI`
(`https://get-openpoint.nelsongx.com/api/auth/callback`), and your real
`ADMIN_DISCORD_IDS`. The prod redirect URIs above are already registered.
