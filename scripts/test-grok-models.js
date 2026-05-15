#!/usr/bin/env node
/*
 * Lists models visible for the configured xAI/Grok API key.
 * Useful when a smoke test returns "Model not found".
 */

const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function getBaseUrl() {
  return (process.env.GROK_API_BASE_URL || 'https://api.x.ai/v1').replace(/\/+$/, '');
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));

  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const endpoint = `${getBaseUrl()}/models`;
  console.log('Grok/xAI models smoke test');
  console.log(`Endpoint: ${endpoint}`);

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store'
  });

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }

  console.log(`Response: HTTP ${response.status}`);
  if (!response.ok) {
    console.error(JSON.stringify(payload, null, 2));
    throw new Error(`Models request failed with HTTP ${response.status}`);
  }

  const models = Array.isArray(payload.data) ? payload.data : [];
  if (!models.length) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Available model ids:');
  for (const model of models) {
    if (model && model.id) console.log(`- ${model.id}`);
  }

  const visionHint = models.filter((model) => /vision|image|grok-4|grok-3/i.test(String(model.id || '')));
  if (visionHint.length) {
    console.log('\nLikely candidates to try for GROK_VISION_MODEL:');
    for (const model of visionHint) console.log(`- ${model.id}`);
  }
}

main().catch((error) => {
  console.error('❌ Grok models smoke test failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
