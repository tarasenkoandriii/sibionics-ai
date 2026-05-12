/* eslint-disable no-console */
require('reflect-metadata');

const { Injectable, Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { X509Certificate, createPrivateKey, createPublicKey, randomUUID } = require('crypto');
const { readFileSync, existsSync, readdirSync } = require('fs');
const path = require('path');
const { request: httpsRequest, Agent: HttpsAgent } = require('https');
const { request: httpRequest } = require('http');
const { URL } = require('url');

const DEFAULT_BASE_URL = 'https://open-api-sandbox.dts.fuib.com/psd2/openbanking/v2';
const DEFAULT_TEST_IBAN = 'UA093348510000026200420671357';
const DEFAULT_PSU_IP = '192.168.1.199';
const DEFAULT_CERT_DIR = 'scripts/certs/pumb/ais-pis';
const DEFAULT_CERT_PATH = `${DEFAULT_CERT_DIR}/client.crt`;
const DEFAULT_KEY_PATH = `${DEFAULT_CERT_DIR}/client.key`;
const DEFAULT_PFX_PATH = `${DEFAULT_CERT_DIR}/client.p12`;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function env(name, fallback) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function envBool(name, fallback) {
  const value = env(name, fallback ? 'true' : 'false').toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(value);
}

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function pp(input) {
  return JSON.stringify(input, null, 2);
}

function walkFiles(rootDir) {
  if (!existsSync(rootDir)) return [];
  const out = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(fullPath));
    if (entry.isFile()) out.push(fullPath);
  }
  return out;
}

function findFirstFile(rootDir, extensions, preferredNames) {
  const files = walkFiles(rootDir);
  const normalizedPreferred = preferredNames.map((name) => name.toLowerCase());
  const candidates = files.filter((file) => extensions.includes(path.extname(file).toLowerCase()));
  const preferred = candidates.find((file) => normalizedPreferred.includes(path.basename(file).toLowerCase()));
  return preferred || candidates[0];
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function assertPemBlock(filePath, pattern, humanName) {
  const text = readText(filePath);
  if (!pattern.test(text)) {
    throw new Error(`${humanName} does not look valid: ${filePath}`);
  }
}

function getFirstPemCertificate(pem) {
  const match = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
  return match ? match[0] : pem;
}


function getPemCertificates(pem) {
  const matches = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
  return matches || [];
}

function normalizePemBlock(block) {
  return block.replace(/\r\n/g, '\n').trim();
}

function certFingerprint(block) {
  return new X509Certificate(block).fingerprint256;
}

function safeReadPemCertificates(filePath) {
  try {
    return getPemCertificates(readText(filePath));
  } catch {
    return [];
  }
}

function fileLooksLikePrivateKey(filePath) {
  try {
    return /-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(readText(filePath));
  } catch {
    return false;
  }
}

function listCertificateFiles(rootDir) {
  return walkFiles(rootDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    if (!['.crt', '.cer', '.pem'].includes(ext)) return false;
    if (fileLooksLikePrivateKey(file)) return false;
    return safeReadPemCertificates(file).length > 0;
  });
}

function buildCertificateChainPem(config, certFiles) {
  const explicitCertPem = readText(certFiles.certPath);
  const explicitCerts = getPemCertificates(explicitCertPem);
  if (!explicitCerts.length) {
    throw new Error(`Certificate file has no PEM certificate blocks: ${certFiles.certPath}`);
  }

  const keyCheck = certAndKeyPublicKeysMatch(certFiles.certPath, certFiles.keyPath, config.certPassphrase);
  const leafFingerprint = keyCheck.certificate.fingerprint256;
  const blocks = [];
  const seen = new Set();

  function addBlock(block, source) {
    const normalized = normalizePemBlock(block);
    const cert = new X509Certificate(normalized);
    const fingerprint = cert.fingerprint256;
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    blocks.push({ block: normalized, cert, source });
  }

  const leafBlock = explicitCerts.find((block) => certFingerprint(block) === leafFingerprint) || explicitCerts[0];
  addBlock(leafBlock, certFiles.certPath);

  for (const block of explicitCerts) {
    if (certFingerprint(block) !== leafFingerprint) addBlock(block, certFiles.certPath);
  }

  const chainPath = config.certChainPath;
  if (chainPath) {
    if (!existsSync(chainPath)) throw new Error(`PUMB_OPEN_BANKING_CERT_CHAIN_PATH not found: ${chainPath}`);
    for (const block of safeReadPemCertificates(chainPath)) addBlock(block, chainPath);
  }

  if (config.autoAppendCertChain) {
    for (const file of listCertificateFiles(config.certDir)) {
      if (path.resolve(file) === path.resolve(certFiles.certPath)) continue;
      if (path.resolve(file) === path.resolve(certFiles.keyPath)) continue;
      for (const block of safeReadPemCertificates(file)) addBlock(block, file);
    }
  }

  return {
    keyCheck,
    chainBlocks: blocks,
    pem: `${blocks.map((item) => item.block).join('\n')  }\n`
  };
}

function printCertificateChainInfo(chain) {
  console.log(`mTLS certificate chain blocks passed to Node: ${chain.chainBlocks.length}`);
  chain.chainBlocks.forEach((item, index) => {
    printCertificateInfo(item.cert, index === 0 ? `Client certificate leaf [${index}]` : `Client certificate chain [${index}]`);
    console.log(`  source: ${item.source}`);
  });
}

function certAndKeyPublicKeysMatch(certPath, keyPath, passphrase) {
  const cert = new X509Certificate(getFirstPemCertificate(readText(certPath)));
  const privateKey = createPrivateKey({
    key: readFileSync(keyPath),
    passphrase: passphrase || undefined
  });

  const certPublicDer = cert.publicKey.export({ type: 'spki', format: 'der' });
  const keyPublicDer = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });

  return {
    match: certPublicDer.equals(keyPublicDer),
    certificate: cert
  };
}

function printCertificateInfo(cert, label) {
  console.log(`${label}:`);
  console.log(`  subject: ${cert.subject}`);
  console.log(`  issuer: ${cert.issuer}`);
  console.log(`  validFrom: ${cert.validFrom}`);
  console.log(`  validTo: ${cert.validTo}`);
  console.log(`  serialNumber: ${cert.serialNumber}`);
  console.log(`  fingerprint256: ${cert.fingerprint256}`);
  console.log(`  ca: ${cert.ca}`);
}

function resolveCertFiles(config) {
  const explicitPfxExists = config.pfxPath && existsSync(config.pfxPath);
  if (explicitPfxExists) {
    return {
      type: 'pfx',
      pfxPath: config.pfxPath,
      caPath: config.caPath,
      source: 'explicit-pfx'
    };
  }

  const certExists = config.certPath && existsSync(config.certPath);
  const keyExists = config.keyPath && existsSync(config.keyPath);

  if (certExists && keyExists) {
    return {
      type: 'pem',
      certPath: config.certPath,
      keyPath: config.keyPath,
      caPath: config.caPath,
      source: 'explicit-env-or-default'
    };
  }

  const searchDir = env('PUMB_OPEN_BANKING_CERT_DIR', DEFAULT_CERT_DIR);
  const discoveredPfx = findFirstFile(searchDir, ['.p12', '.pfx'], ['client.p12', 'client.pfx', 'ais_pis.p12', 'ais_pis.pfx']);
  if (discoveredPfx) {
    return {
      type: 'pfx',
      pfxPath: discoveredPfx,
      caPath: config.caPath,
      source: `auto-discovered-pfx-in-${searchDir}`
    };
  }

  const discoveredCert = findFirstFile(searchDir, ['.crt', '.cer', '.pem'], [
    'client.crt',
    'cert.crt',
    'certificate.crt',
    'client.pem',
    'cert.pem',
    'dev_ais_pis_cert.pem'
  ]);
  const discoveredKey = findFirstFile(searchDir, ['.key', '.pem'], [
    'client.key',
    'key.key',
    'private.key',
    'client.pem',
    'key.pem',
    'dev_ais_pis_key.pem'
  ]);

  if (discoveredCert && discoveredKey) {
    return {
      type: 'pem',
      certPath: discoveredCert,
      keyPath: discoveredKey,
      caPath: config.caPath,
      source: `auto-discovered-pem-in-${searchDir}`
    };
  }

  const missing = [];
  if (!explicitPfxExists) missing.push(`PUMB_OPEN_BANKING_PFX_PATH not found: ${config.pfxPath}`);
  if (!certExists) missing.push(`PUMB_OPEN_BANKING_CERT_PATH not found: ${config.certPath}`);
  if (!keyExists) missing.push(`PUMB_OPEN_BANKING_KEY_PATH not found: ${config.keyPath}`);

  throw new Error([
    ...missing,
    '',
    'PUMB Open Banking sandbox requires the public PUMB test key pair for mTLS.',
    'Put extracted AIS_PIS test files into:',
    `  ${DEFAULT_CERT_PATH}`,
    `  ${DEFAULT_KEY_PATH}`,
    'or:',
    `  ${DEFAULT_PFX_PATH}`,
    '',
    'Or set explicit paths in .env.local:',
    '  PUMB_OPEN_BANKING_CERT_PATH=/absolute/or/relative/path/to/client.crt',
    '  PUMB_OPEN_BANKING_KEY_PATH=/absolute/or/relative/path/to/client.key',
    '  PUMB_OPEN_BANKING_PFX_PATH=/absolute/or/relative/path/to/client.p12',
    '',
    'Official PUMB page: https://www.pumb.ua/en/open_api',
    'Use the AIS_PIS test key pair from the “Test Data and Certificates” section.'
  ].join('\n'));
}

function buildTlsOptions(config, certFiles) {
  if (config.caPath && !existsSync(config.caPath)) {
    throw new Error(`PUMB_OPEN_BANKING_CA_PATH not found: ${config.caPath}`);
  }

  const base = {
    ca: config.caPath ? readFileSync(config.caPath) : undefined,
    passphrase: config.certPassphrase,
    rejectUnauthorized: config.rejectUnauthorized,
    minVersion: env('PUMB_OPEN_BANKING_TLS_MIN_VERSION', 'TLSv1.2')
  };

  if (certFiles.type === 'pfx') {
    return {
      ...base,
      pfx: readFileSync(certFiles.pfxPath)
    };
  }

  assertPemBlock(certFiles.certPath, /-----BEGIN CERTIFICATE-----/, 'Certificate file');
  assertPemBlock(certFiles.keyPath, /-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/, 'Private key file');

  const chain = buildCertificateChainPem(config, certFiles);
  console.log(`Certificate/private key match: ${chain.keyCheck.match ? 'yes' : 'NO'}`);
  printCertificateChainInfo(chain);
  console.log('');

  if (!chain.keyCheck.match) {
    throw new Error([
      'The selected PUMB client certificate and private key do not match.',
      `Certificate: ${certFiles.certPath}`,
      `Private key: ${certFiles.keyPath}`,
      'Download/extract the AIS_PIS pair again or set explicit paths to the matching files.'
    ].join('\n'));
  }

  return {
    ...base,
    cert: chain.pem,
    key: readFileSync(certFiles.keyPath)
  };
}

function explainPumbSslCertificateError(certFiles) {
  const selected = certFiles.type === 'pfx'
    ? `PFX: ${certFiles.pfxPath}`
    : `Certificate: ${certFiles.certPath}\nPrivate key: ${certFiles.keyPath}`;

  return [
    'PUMB sandbox nginx returned “400 The SSL certificate error”.',
    '',
    'That means the HTTPS connection reached PUMB, but PUMB rejected the client certificate during mutual TLS.',
    '',
    selected,
    '',
    'Most common causes:',
    '1. Wrong test pair: use AIS_PIS for this smoke test, not only AIS or only PIS.',
    '2. Wrong file: use the leaf/client certificate, not CA/root certificate.',
    '3. Missing chain/intermediate: keep the leaf certificate first and include intermediate/root certificates after it.',
    '   This script now auto-appends extra .pem/.crt/.cer certificate files from PUMB_OPEN_BANKING_CERT_DIR.',
    '4. Expired or old downloaded test pair: download the current pair from PUMB “Test Data and Certificates”.',
    '5. Encrypted key without passphrase: set PUMB_OPEN_BANKING_CERT_PASSPHRASE.',
    '',
    'Run a local certificate check without making a request:',
    '  npm run smoke:pumb-open-banking -- --inspect-certs',
    '',
    'You can also try a PFX/P12 if PUMB provides it:',
    '  PUMB_OPEN_BANKING_PFX_PATH=scripts/certs/pumb/ais-pis/client.p12',
    '',
    'If the script prints more than one chain block and PUMB still rejects it, the sandbox trust store probably does not trust this test pair.',
    '',
    'Official PUMB Open Banking page: https://www.pumb.ua/en/open_api'
  ].join('\n');
}

class PumbOpenBankingConfigService {
  get() {
    const mode = env('PUMB_OPEN_BANKING_MODE', 'ais-pis');
    const config = {
      baseUrl: env('PUMB_OPEN_BANKING_SANDBOX_URL', DEFAULT_BASE_URL),
      psuIban: env('PUMB_OPEN_BANKING_TEST_IBAN', DEFAULT_TEST_IBAN),
      psuIpAddress: env('PUMB_OPEN_BANKING_PSU_IP_ADDRESS', DEFAULT_PSU_IP),
      certPath: env('PUMB_OPEN_BANKING_CERT_PATH', DEFAULT_CERT_PATH),
      keyPath: env('PUMB_OPEN_BANKING_KEY_PATH', DEFAULT_KEY_PATH),
      pfxPath: env('PUMB_OPEN_BANKING_PFX_PATH', DEFAULT_PFX_PATH),
      caPath: env('PUMB_OPEN_BANKING_CA_PATH'),
      certPassphrase: env('PUMB_OPEN_BANKING_CERT_PASSPHRASE'),
      certDir: env('PUMB_OPEN_BANKING_CERT_DIR', DEFAULT_CERT_DIR),
      certChainPath: env('PUMB_OPEN_BANKING_CERT_CHAIN_PATH'),
      autoAppendCertChain: envBool('PUMB_OPEN_BANKING_AUTO_APPEND_CERT_CHAIN', true),
      mode,
      targetConsentState: env('PUMB_OPEN_BANKING_TARGET_CONSENT_STATE', 'valid'),
      timeoutMs: Number(env('PUMB_OPEN_BANKING_TIMEOUT_MS', '30000')),
      rejectUnauthorized: envBool('PUMB_OPEN_BANKING_REJECT_UNAUTHORIZED', true),
      inspectOnly: process.argv.includes('--inspect-certs') || envBool('PUMB_OPEN_BANKING_INSPECT_CERTS_ONLY', false)
    };

    if (!['ais', 'pis', 'ais-pis'].includes(config.mode)) {
      throw new Error('PUMB_OPEN_BANKING_MODE must be one of: ais, pis, ais-pis');
    }

    return config;
  }
}
Injectable()(PumbOpenBankingConfigService);

class PumbOpenBankingHttpClient {
  constructor(configService) {
    this.configService = configService;
    this.resolvedCertFiles = undefined;
  }

  getCertFiles(config) {
    if (!this.resolvedCertFiles) {
      this.resolvedCertFiles = resolveCertFiles(config);
      console.log(`Certificate source: ${this.resolvedCertFiles.source}`);
      console.log(`Certificate dir: ${config.certDir}`);
      console.log(`Explicit chain path: ${config.certChainPath || '(not set)'}`);
      console.log(`Auto append cert chain: ${config.autoAppendCertChain ? 'true' : 'false'}`);
      if (this.resolvedCertFiles.type === 'pfx') {
        console.log(`PFX: ${this.resolvedCertFiles.pfxPath}`);
      } else {
        console.log(`Certificate: ${this.resolvedCertFiles.certPath}`);
        console.log(`Private key: ${this.resolvedCertFiles.keyPath}`);
      }
      console.log('');
    }
    return this.resolvedCertFiles;
  }

  inspectCertificates() {
    const config = this.configService.get();
    const certFiles = this.getCertFiles(config);
    if (certFiles.type === 'pfx') {
      console.log('PFX/P12 selected. Node will pass it as mTLS client credentials.');
      console.log('If it is encrypted, set PUMB_OPEN_BANKING_CERT_PASSPHRASE.');
      return;
    }
    buildTlsOptions(config, certFiles);
    console.log('✅ Local certificate inspection passed.');
    console.log('This only proves that the local cert/key files are parseable and match.');
    console.log('PUMB may still reject the certificate if it is not the current AIS_PIS sandbox pair.');
  }

  async request(method, pathName, headers, body) {
    const config = this.configService.get();
    const url = new URL(`${config.baseUrl.replace(/\/$/, '')}/${pathName.replace(/^\//, '')}`);
    const isHttps = url.protocol === 'https:';
    const payload = body === undefined ? undefined : JSON.stringify(body);

    const requestHeaders = {
      Accept: 'application/json',
      'X-Request-ID': randomUUID(),
      ...headers
    };

    if (payload !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
      requestHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const requestOptions = {
      method,
      hostname: url.hostname,
      servername: url.hostname,
      port: url.port ? Number(url.port) : isHttps ? 443 : 80,
      path: `${url.pathname}${url.search}`,
      headers: requestHeaders,
      timeout: config.timeoutMs
    };

    let certFiles;
    if (isHttps) {
      certFiles = this.getCertFiles(config);
      requestOptions.agent = new HttpsAgent(buildTlsOptions(config, certFiles));
    }

    const transport = isHttps ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const req = transport(requestOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const bodyParsed = parseJson(rawBody);
          if (res.statusCode === 400 && /SSL certificate error/i.test(rawBody) && certFiles) {
            const error = new Error(explainPumbSslCertificateError(certFiles));
            error.response = { statusCode: res.statusCode, headers: res.headers, body: bodyParsed, rawBody };
            reject(error);
            return;
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: bodyParsed,
            rawBody
          });
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`PUMB Open Banking request timeout after ${config.timeoutMs} ms`));
      });
      req.on('error', reject);

      if (payload !== undefined) req.write(payload);
      req.end();
    });
  }
}
Injectable()(PumbOpenBankingHttpClient);
Reflect.defineMetadata('design:paramtypes', [PumbOpenBankingConfigService], PumbOpenBankingHttpClient);

class PumbOpenBankingSmokeTestService {
  constructor(configService, http) {
    this.configService = configService;
    this.http = http;
  }

  async run() {
    const config = this.configService.get();

    console.log('PUMB Open Banking sandbox smoke test');
    console.log(`Base URL: ${config.baseUrl}`);
    console.log(`Mode: ${config.mode}`);
    console.log(`PSU IBAN: ${config.psuIban}`);
    console.log('');

    if (config.inspectOnly) {
      this.http.inspectCertificates();
      return;
    }

    await this.createAisConsentAndAuthorisation(config);
  }

  async createAisConsentAndAuthorisation(config) {
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const consentPayload = {
      access: {
        balances: [{ iban: config.psuIban }],
        transactions: [{ iban: config.psuIban }]
      },
      recurringIndicator: true,
      validUntil,
      frequencyPerDay: 4,
      combinedServiceIndicator: false
    };

    console.log('Creating AIS account-access consent...');
    const consentResponse = await this.http.request('POST', '/consents/account-access', {
      'PSU-ID': config.psuIban,
      'PSU-ID-Type': 'IBAN',
      'PSU-IP-Address': config.psuIpAddress
    }, consentPayload);

    this.printResponse('Consent response', consentResponse);
    this.assert2xx('Create consent', consentResponse);

    const consentId = this.extractConsentId(consentResponse);
    if (!consentId) {
      throw new Error(`Consent was created but consentId could not be extracted. Response: ${pp(consentResponse.body)}`);
    }

    console.log(`Consent ID: ${consentId}`);
    console.log('Creating consent authorisation with sandbox Target-Consent-State...');

    const authorisationResponse = await this.http.request('POST', `/consents/${encodeURIComponent(consentId)}/authorisations`, {
      'PSU-IP-Address': config.psuIpAddress,
      'Target-Consent-State': config.targetConsentState
    }, {});

    this.printResponse('Authorisation response', authorisationResponse);
    this.assert2xx('Create consent authorisation', authorisationResponse);

    console.log('');
    console.log('✅ PUMB Open Banking sandbox smoke test passed');
    console.log(`Consent ID: ${consentId}`);
    console.log('Use Consent-ID above for balance/history tests if enabled by the sandbox/API description.');
  }

  extractConsentId(response) {
    const body = response.body;
    if (body && typeof body === 'object') {
      const candidates = [
        body.consentId,
        body.consentID,
        body.id,
        body.data && body.data.consentId,
        body.data && body.data.id
      ];
      const found = candidates.find((value) => typeof value === 'string' && value.length > 0);
      if (found) return found;
    }

    const locationHeader = response.headers.location;
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
    if (location) {
      const match = location.match(/consents\/([^/]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }

    return undefined;
  }

  assert2xx(operation, response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    throw new Error(`${operation} failed with HTTP ${response.statusCode}: ${pp(response.body)}`);
  }

  printResponse(label, response) {
    console.log(`${label}: HTTP ${response.statusCode}`);
    console.log(pp(response.body));
    console.log('');
  }
}
Injectable()(PumbOpenBankingSmokeTestService);
Reflect.defineMetadata('design:paramtypes', [PumbOpenBankingConfigService, PumbOpenBankingHttpClient], PumbOpenBankingSmokeTestService);

class PumbOpenBankingSmokeTestModule {}
Module({
  providers: [
    PumbOpenBankingConfigService,
    PumbOpenBankingHttpClient,
    PumbOpenBankingSmokeTestService
  ]
})(PumbOpenBankingSmokeTestModule);

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PumbOpenBankingSmokeTestModule, {
    logger: ['error', 'warn']
  });

  try {
    const service = app.get(PumbOpenBankingSmokeTestService);
    await service.run();
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('❌ PUMB Open Banking sandbox smoke test failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
