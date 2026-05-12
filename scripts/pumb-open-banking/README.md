# PUMB Open Banking sandbox smoke test

Standalone NestJS application context for a manual smoke test against the public PUMB/FUIB Open Banking sandbox.

## What it does

1. Loads `.env.local` / `.env` automatically.
2. Resolves public PUMB AIS_PIS test certificate/key files for mTLS.
3. Creates an AIS account-access consent for a public PUMB test IBAN.
4. Creates a consent authorisation with `Target-Consent-State=valid` to emulate successful SCA in the sandbox.
5. Prints HTTP status, response JSON and `Consent ID`.

It is intentionally **not** included in `npm test` and should be run manually.

## Install

```bash
npm ci
```

## Certificate files

The PUMB Open Banking page provides public sandbox test key pairs in the **Test Data and Certificates** section.
Download `AIS_PIS` and extract the certificate/key.

Official page:

```txt
https://www.pumb.ua/en/open_api
```

Default expected paths:

```txt
scripts/certs/pumb/ais-pis/client.crt
scripts/certs/pumb/ais-pis/client.key
```

If the extracted file names differ, you have two options.

### Option A: set explicit paths

```env
PUMB_OPEN_BANKING_CERT_PATH=scripts/certs/pumb/ais-pis/<actual-certificate-file>.crt
PUMB_OPEN_BANKING_KEY_PATH=scripts/certs/pumb/ais-pis/<actual-private-key-file>.key
```

### Option B: put extracted files in the default folder

The script now auto-detects the first `.crt`, `.cer`, or `.pem` file as certificate and the first `.key` or `.pem` file as private key under:

```txt
scripts/certs/pumb/ais-pis
```

So this also works:

```txt
scripts/certs/pumb/ais-pis/ais_pis.crt
scripts/certs/pumb/ais-pis/ais_pis.key
```

## Environment variables

```env
PUMB_OPEN_BANKING_SANDBOX_URL=https://open-api-sandbox.dts.fuib.com/psd2/openbanking/v2
PUMB_OPEN_BANKING_MODE=ais-pis
PUMB_OPEN_BANKING_TEST_IBAN=UA093348510000026200420671357
PUMB_OPEN_BANKING_PSU_IP_ADDRESS=192.168.1.199
PUMB_OPEN_BANKING_TARGET_CONSENT_STATE=valid

PUMB_OPEN_BANKING_CERT_DIR=scripts/certs/pumb/ais-pis
PUMB_OPEN_BANKING_CERT_PATH=scripts/certs/pumb/ais-pis/client.crt
PUMB_OPEN_BANKING_KEY_PATH=scripts/certs/pumb/ais-pis/client.key
PUMB_OPEN_BANKING_CA_PATH=
PUMB_OPEN_BANKING_CERT_PASSPHRASE=
PUMB_OPEN_BANKING_REJECT_UNAUTHORIZED=true
PUMB_OPEN_BANKING_TIMEOUT_MS=30000
```

Public test IBANs from the PUMB page:

```txt
UA093348510000026200420671357 -> UAH -> active
UA243348510000026200891826956 -> UAH -> closed
UA693348510000026200687905180 -> USD -> active
UA893348510000026200375382169 -> EUR -> active
UA763348510000026000920056231 -> UAH -> active
```

## Run

```bash
npm run smoke:pumb-open-banking
```

## Fix for `PUMB_OPEN_BANKING_CERT_PATH not found`

This error means the script reached the sandbox request but cannot open the mTLS certificate file locally.

Fix:

1. Open `https://www.pumb.ua/en/open_api`.
2. In **Test Data and Certificates**, download `AIS_PIS` test key pair.
3. Extract it.
4. Put the extracted certificate/key into `scripts/certs/pumb/ais-pis`.
5. Either rename them to `client.crt` and `client.key`, or set `PUMB_OPEN_BANKING_CERT_PATH` and `PUMB_OPEN_BANKING_KEY_PATH` to the real file names.

Then run again:

```bash
npm run smoke:pumb-open-banking
```

## Notes

- The script uses only public sandbox data.
- PUMB states that test key pairs should be obtained and development/testing should be done using test data.
- PUMB states that `Target-Consent-State=valid` emulates account-access consent confirmation in sandbox authorisation methods.
- If the sandbox requires extra signing headers from the API Description/OAS, the script will print the exact HTTP error response so the headers can be adjusted.
