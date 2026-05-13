# GlucoMind GS3 — AI Diabetes SaaS

Next.js project for a Dexcom-style diabetes SaaS layer on top of the existing Sibionics GS3 selling site.

The project now contains:

- realtime CGM glucose stream through Server-Sent Events (`/api/cgm/stream`);
- dashboard with live glucose, chart, trend, Time in Range and 30/60/120 minute prediction;
- mock + AI-ready CGM prediction engine (`lib/cgm.ts`, `/api/cgm/predict`);
- AI voice doctor with text input, browser speech recognition, browser TTS fallback, and optional OpenAI TTS;
- onboarding wizard with file-based profile storage;
- Telegram Mini App login with backend HMAC validation of `initData`;
- multi-language UI: Ukrainian default, Russian, Polish and English;
- WayForPay subscription checkout and callback activation;
- Telegram bot notifications for orders, TTN, and subscription billing events;
- existing GS3 product checkout, dynamic sensor/transponder order pricing, WayForPay payment, Nova Poshta/Ukrposhta TTN generation and 4-mode photo AI analysis.

## Routes

### App pages

```txt
/                     -> redirects to /ua
/ua                   -> SaaS landing, Ukrainian default
/ua/dashboard         -> realtime CGM + AI voice doctor + photo AI
/ua/onboarding        -> onboarding wizard
/ua/pricing           -> subscription plans + WayForPay checkout
/ua/mini-app          -> Telegram Mini App login test page
/ru, /pl, /en         -> same structure in other languages
```

### API routes

```txt
/api/cgm/latest                  GET  mock timeline + prediction
/api/cgm/stream                  GET  realtime SSE glucose stream
/api/cgm/predict                 POST mock prediction, optional OpenAI refinement
/api/ai/doctor                   POST AI doctor response, local fallback without key
/api/ai/voice/speech             POST OpenAI TTS audio, browser fallback on client
/api/ai/analyze                  POST existing 4-mode photo AI analysis
/api/auth/telegram/miniapp       POST Telegram Mini App initData validation
/api/subscriptions/create        POST create free or paid subscription checkout
/api/subscriptions/status        GET  read subscription by ID
/api/subscriptions/invoice       POST admin renewal invoice through WayForPay
/api/payments/wayforpay/create  POST default product checkout
/api/payments/wayforpay/callback POST product + subscription payment callback
/api/delivery/ttn/create         POST admin TTN creation
```

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```txt
http://localhost:3000/ua
```

## Required production variables

Minimum for SaaS demo without external payments or AI:

```bash
SAAS_MODE=false
NEXT_PUBLIC_SITE_URL=https://your-domain.com
AUTH_SESSION_SECRET=replace-with-long-random-value
ORDER_ADMIN_TOKEN=replace-with-admin-token
```

For OpenAI AI doctor, image analysis and voice:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=marin
CGM_AI_PREDICTION=false
```

Set `CGM_AI_PREDICTION=true` only when you want `/api/cgm/predict` to ask OpenAI to refine the mock prediction text.

For WayForPay:

```bash
WAYFORPAY_USE_TEST_CREDENTIALS=false
WAYFORPAY_MERCHANT_ACCOUNT=
WAYFORPAY_MERCHANT_SECRET_KEY=
WAYFORPAY_MERCHANT_DOMAIN_NAME=your-domain.com
WAYFORPAY_RETURN_URL=https://your-domain.com/ua?payment=success
WAYFORPAY_SERVICE_URL=https://your-domain.com/api/payments/wayforpay/callback
```

Legacy Hutko/PUMB variables can remain in `.env.local` if you still want to test `/api/payments/hutko/*`.

Set `SAAS_MODE=true` when you want to show the SaaS navigation, dashboard/onboarding/pricing-first flow and subscription-oriented header. By default `SAAS_MODE=false` keeps the public site focused on the product order form.

For Telegram SaaS auth, bot notifications and Mini App login:

```bash
# SaaS session cookie
AUTH_SESSION_SECRET=replace-with-long-random-value
AUTH_SESSION_MAX_AGE_SECONDS=2592000
AUTH_REQUIRE_TELEGRAM=false

# Website Login with Telegram via OIDC + PKCE
TELEGRAM_CLIENT_ID=
TELEGRAM_CLIENT_SECRET=
TELEGRAM_REDIRECT_URI=https://your-domain.com/api/auth/telegram/callback

# Mini App signed initData validation
TELEGRAM_BOT_TOKEN=
TELEGRAM_MINI_APP_BOT_TOKEN=
TELEGRAM_INITDATA_MAX_AGE_SECONDS=86400

# Order/subscription notifications
TELEGRAM_ORDER_CHAT_ID=
TELEGRAM_ORDER_NOTIFICATIONS=true
```

`TELEGRAM_MINI_APP_BOT_TOKEN` is optional if it is the same as `TELEGRAM_BOT_TOKEN`. Telegram login is optional by default: visitors can use the landing, product order form, onboarding and CGM dashboard in guest/demo mode. After either Mini App or OIDC login, the app creates an `app_session` HTTP-only cookie and a legacy `tg_session` cookie. Set `AUTH_REQUIRE_TELEGRAM=true` only if you want to make `/:locale/dashboard` and `/:locale/onboarding` protected.

For delivery TTN generation:

```bash
DELIVERY_AUTO_CREATE_TTN=true
NOVA_POSHTA_API_KEY=
NOVA_POSHTA_CITY_SENDER_REF=
NOVA_POSHTA_SENDER_REF=
NOVA_POSHTA_SENDER_ADDRESS_REF=
NOVA_POSHTA_CONTACT_SENDER_REF=
NOVA_POSHTA_SENDER_PHONE=
UKRPOSHTA_BEARER=
UKRPOSHTA_COUNTERPARTY_TOKEN=
UKRPOSHTA_COUNTERPARTY_UUID=
UKRPOSHTA_SENDER_UUID=
UKRPOSHTA_SENDER_ADDRESS_ID=
```


## Telegram auth architecture

Implemented routes:

```txt
GET  /api/auth/telegram/start?locale=ua
GET  /api/auth/telegram/oidc/start?locale=ua
GET  /api/auth/telegram/callback
GET  /api/auth/telegram/oidc/callback
POST /api/auth/telegram/miniapp
GET  /api/auth/me
POST /api/auth/logout
```

Website auth uses Telegram OIDC with `state` and PKCE cookies. Mini App auth validates `Telegram.WebApp.initData` on the server using the bot token. Both flows upsert a file-store SaaS user in `.data/users`, then issue a signed HTTP-only `app_session` cookie. Middleware allows guest access by default; it only protects dashboard/onboarding when `AUTH_REQUIRE_TELEGRAM=true`.

## CGM prediction engine

The mock engine is intentionally deterministic and safe for demos:

- generates a daily glucose curve with breakfast/lunch/dinner effects;
- computes trend arrows and risk levels;
- predicts 30, 60 and 120 minutes ahead;
- accepts optional `mealCarbsGrams` and `activeInsulinUnits`;
- returns safety-first suggested actions;
- can be replaced by a real CGM ingestion adapter later.

Example:

```bash
curl -X POST http://localhost:3000/api/cgm/predict \
  -H 'Content-Type: application/json' \
  -d '{"mealCarbsGrams":45,"activeInsulinUnits":1.5,"locale":"ua"}'
```


## GS3 product order configuration

Product order prices are centralized in `lib/order-config.ts`:

```ts
sensor.firstUnitPriceUah = 900
sensor.additionalUnitPriceUah = 800
transponder.unitPriceUah = 500
tapeGift.minSensorQuantity = 2
```

The product order form now supports any sensor quantity from 1 to 100, an optional transponder checkbox, tiered sensor pricing (first sensor 900 UAH, second and following sensors 800 UAH each), and automatic free tapes for orders with 2 or more sensors. The same `calculateProductOrder()` helper is used by the client form and `/api/payments/wayforpay/create`, so the UI total and WayForPay checkout amount stay in sync. The Hutko route is still present as legacy/fallback code.

## Subscription billing model

WayForPay is used as the default payment provider for paid plans. The code implements subscriptions as:

1. user chooses a plan on `/ua/pricing`;
2. `/api/subscriptions/create` creates a subscription record and WayForPay checkout for paid plans;
3. WayForPay sends callback to `/api/payments/wayforpay/callback`;
4. callback verifies signature and activates the subscription;
5. `/api/subscriptions/invoice` can be called by an admin/cron to issue renewal checkout links.

The legacy Hutko/PUMB implementation remains in the project under `/api/payments/hutko/*`.

## Telegram Mini App login

The page `/ua/mini-app` reads `window.Telegram.WebApp.initData` on the client and sends it to:

```txt
POST /api/auth/telegram/miniapp
```

The backend validates the HMAC signature with the bot token, checks freshness, extracts the Telegram user and writes the existing `tg_session` cookie.

## Medical safety

All AI features include explicit guardrails. They are designed for education, pattern explanation and triage hints only. They do not diagnose, prescribe treatment, or calculate insulin dosing.

## File storage

The project uses file storage under `.data` for local/VPS demos:

```txt
.data/orders
.data/orders/subscriptions
.data/orders/subscription-checkouts
.data/orders/onboarding
```

Use a real database for production serverless deployments.

## WayForPay default payment provider

WayForPay is now the default checkout provider for product orders and subscription billing. Hutko/PUMB code remains in the project under `lib/hutko.ts` and `/api/payments/hutko/*` as legacy/fallback integration.

Default product checkout endpoint:

```txt
POST /api/payments/wayforpay/create
```

WayForPay callback endpoint:

```txt
POST /api/payments/wayforpay/callback
```

Local sandbox smoke test with WayForPay test merchant credentials:

```bash
npm run test:wayforpay
```

The script uses WayForPay public test merchant credentials by default:

```env
WAYFORPAY_MERCHANT_ACCOUNT=test_merch_n1
WAYFORPAY_MERCHANT_SECRET_KEY=flk3409refn54t54t*FNJRET
```

For production, set `WAYFORPAY_USE_TEST_CREDENTIALS=false` and provide your real merchant credentials in `.env.local`.


## Header mode flags

```env
SAAS_MODE=false
MINI_APP=false
```

- `SAAS_MODE=false`: header shows only Home and Dashboard; the Start button is hidden.
- `SAAS_MODE=true`: header shows SaaS navigation and the Start button.
- `MINI_APP=true`: the Mini App menu item is shown.
- `MINI_APP=false`: the Mini App menu item is hidden.

The order form also stores Telegram preferences: notify about order updates and add the customer to a Telegram group if needed.

## Telegram mini-app
