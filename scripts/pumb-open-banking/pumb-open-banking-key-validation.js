/* eslint-disable no-console */

const { X509Certificate, createPrivateKey, createPublicKey } = require('crypto');
const { readFileSync, existsSync, readdirSync } = require('fs');
const path = require('path');

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
  if (config.pfxPath && existsSync(config.pfxPath)) {
    return { type: 'pfx', pfxPath: config.pfxPath, source: 'explicit-pfx' };
  }

  if (config.certPath && existsSync(config.certPath) && config.keyPath && existsSync(config.keyPath)) {
    return {
      type: 'pem',
      certPath: config.certPath,
      keyPath: config.keyPath,
      source: 'explicit-env-or-default'
    };
  }

  const discoveredPfx = findFirstFile(config.certDir, ['.p12', '.pfx'], [
    'client.p12',
    'client.pfx',
    'ais_pis.p12',
    'ais_pis.pfx'
  ]);
  if (discoveredPfx) return { type: 'pfx', pfxPath: discoveredPfx, source: `auto-discovered-pfx-in-${config.certDir}` };

  const discoveredCert = findFirstFile(config.certDir, ['.crt', '.cer', '.pem'], [
    'client.crt',
    'cert.crt',
    'certificate.crt',
    'client.pem',
    'cert.pem',
    'dev_ais_pis_cert.pem'
  ]);
  const discoveredKey = findFirstFile(config.certDir, ['.key', '.pem'], [
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
      source: `auto-discovered-pem-in-${config.certDir}`
    };
  }

  throw new Error([
    'PUMB Open Banking key validation could not resolve certificate files.',
    '',
    `PUMB_OPEN_BANKING_CERT_DIR: ${config.certDir}`,
    `PUMB_OPEN_BANKING_CERT_PATH: ${config.certPath}`,
    `PUMB_OPEN_BANKING_KEY_PATH: ${config.keyPath}`,
    `PUMB_OPEN_BANKING_PFX_PATH: ${config.pfxPath}`,
    '',
    'Put extracted AIS_PIS test files into scripts/certs/pumb/ais-pis or set explicit paths in .env.local.'
  ].join('\n'));
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

  if (config.certChainPath) {
    if (!existsSync(config.certChainPath)) {
      throw new Error(`PUMB_OPEN_BANKING_CERT_CHAIN_PATH not found: ${config.certChainPath}`);
    }
    for (const block of safeReadPemCertificates(config.certChainPath)) addBlock(block, config.certChainPath);
  }

  if (config.autoAppendCertChain) {
    for (const file of listCertificateFiles(config.certDir)) {
      if (path.resolve(file) === path.resolve(certFiles.certPath)) continue;
      if (path.resolve(file) === path.resolve(certFiles.keyPath)) continue;
      for (const block of safeReadPemCertificates(file)) addBlock(block, file);
    }
  }

  return { keyCheck, chainBlocks: blocks, pem: `${blocks.map((item) => item.block).join('\n')}\n` };
}

function printCertificateChainInfo(chain) {
  console.log(`mTLS certificate chain blocks passed to Node: ${chain.chainBlocks.length}`);
  chain.chainBlocks.forEach((item, index) => {
    printCertificateInfo(item.cert, index === 0 ? `Client certificate leaf [${index}]` : `Client certificate chain [${index}]`);
    console.log(`  source: ${item.source}`);
  });
}

function loadConfig() {
  return {
    certDir: env('PUMB_OPEN_BANKING_CERT_DIR', DEFAULT_CERT_DIR),
    certPath: env('PUMB_OPEN_BANKING_CERT_PATH', DEFAULT_CERT_PATH),
    keyPath: env('PUMB_OPEN_BANKING_KEY_PATH', DEFAULT_KEY_PATH),
    pfxPath: env('PUMB_OPEN_BANKING_PFX_PATH', DEFAULT_PFX_PATH),
    certPassphrase: env('PUMB_OPEN_BANKING_CERT_PASSPHRASE'),
    certChainPath: env('PUMB_OPEN_BANKING_CERT_CHAIN_PATH'),
    autoAppendCertChain: envBool('PUMB_OPEN_BANKING_AUTO_APPEND_CERT_CHAIN', true)
  };
}

function main() {
  const config = loadConfig();

  console.log('PUMB Open Banking key validation');
  console.log(`Certificate dir: ${config.certDir}`);
  console.log(`Explicit chain path: ${config.certChainPath || '(not set)'}`);
  console.log(`Auto append cert chain: ${config.autoAppendCertChain ? 'true' : 'false'}`);
  console.log('');

  const certFiles = resolveCertFiles(config);
  console.log(`Certificate source: ${certFiles.source}`);

  if (certFiles.type === 'pfx') {
    console.log(`PFX/P12: ${certFiles.pfxPath}`);
    console.log('✅ PFX/P12 file exists and was selected. Live smoke test will pass it as mTLS credentials.');
    console.log('If it is encrypted, set PUMB_OPEN_BANKING_CERT_PASSPHRASE. Chain auto-append is only used for PEM cert/key mode.');
    return;
  }

  console.log(`Certificate: ${certFiles.certPath}`);
  console.log(`Private key: ${certFiles.keyPath}`);
  console.log('');

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

  console.log('✅ PUMB Open Banking key validation passed.');
  console.log('This validates local cert/key/chain handling only. PUMB can still reject the cert if the sandbox trust store does not trust this key pair.');
}

try {
  main();
} catch (error) {
  console.error('❌ PUMB Open Banking key validation failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
