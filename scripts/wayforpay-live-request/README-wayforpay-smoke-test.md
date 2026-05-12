# WayForPay full smoke test

Run:

```bash
npm run test:wayforpay
# or
npm run test:wayforpay:full
```

The test loads `.env.local` first and then `.env`.

Required variables:

```env
WAYFORPAY_MERCHANT_ACCOUNT=
WAYFORPAY_MERCHANT_SECRET_KEY=
WAYFORPAY_MERCHANT_DOMAIN_NAME=
WAYFORPAY_PURCHASE_URL=https://secure.wayforpay.com/pay
WAYFORPAY_API_URL=https://api.wayforpay.com/api
WAYFORPAY_RETURN_URL=
WAYFORPAY_SERVICE_URL=
```

`WAYFORPAY_MERCHANT_PASSWORD` is loaded and reported as present/absent, but Purchase and Check Status use `WAYFORPAY_MERCHANT_SECRET_KEY` for HMAC_MD5 signatures.

The smoke test performs:

1. Env/config validation.
2. Purchase signature generation.
3. Callback signature generation using a simulated Approved payload.
4. Service response signature generation.
5. `POST https://secure.wayforpay.com/pay?behavior=offline` to create a payment URL.
6. Optional `CHECK_STATUS` request to `https://api.wayforpay.com/api`.
7. Optional POST of the simulated callback to `WAYFORPAY_SERVICE_URL` if `WAYFORPAY_TEST_RUN_LOCAL_CALLBACK=true`.
8. JSON report in `scripts/reports/`.

This script is not connected to `npm test` to avoid accidental external calls.
