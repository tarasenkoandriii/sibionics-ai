#!/usr/bin/env node
/*
 * Grok sensor installation photo quality smoke test.
 *
 * This script intentionally uses the same backend endpoint as Telegram Mini App /install:
 *   POST /api/ai/analyze
 * with mode=sensor_tape and an uploaded image.
 *
 * It does not call Grok/xAI directly. Start the Next.js app first with Grok env configured.
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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getEnvBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function resolveBaseUrl() {
  return (
    process.env.AI_ANALYSIS_TEST_BASE_URL ||
    process.env.TEST_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function resolveImagePath() {
  return path.resolve(
    process.cwd(),
    process.env.AI_ANALYSIS_TEST_IMAGE ||
      'scripts/fixtures/sensor-installation-quality-test.jpg'
  );
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));

  const baseUrl = resolveBaseUrl();
  const endpoint = `${baseUrl}/api/ai/analyze`;
  const imagePath = resolveImagePath();
  const mock = getEnvBoolean('AI_ANALYSIS_MOCK', false);

  console.log('Grok sensor installation AI smoke test');
  console.log(`Backend endpoint: ${endpoint}`);
  console.log(`Mode: sensor_tape`);
  console.log(`Image: ${imagePath}`);
  console.log(`Mock mode: ${mock ? 'true' : 'false'}`);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Test image not found: ${imagePath}`);
  }

  if (!mock && !process.env.XAI_API_KEY) {
    console.warn('Warning: XAI_API_KEY is not set in this shell. The backend must have XAI_API_KEY configured unless AI_ANALYSIS_MOCK=true.');
  }


  const configuredVisionModel = process.env.GROK_VISION_MODEL || '';
  if (!mock && configuredVisionModel.includes('/')) {
    console.warn(`Warning: GROK_VISION_MODEL=${configuredVisionModel} looks like an OpenRouter model id. Direct xAI API expects ids like grok-4, not grok/compound-mini.`);
  }
  if (!mock && /imagine|image-gen|image_generation|image-generation|aurora/i.test(configuredVisionModel)) {
    console.warn(`Warning: GROK_VISION_MODEL=${configuredVisionModel} looks like an image generation model. For photo analysis use a chat/vision model returned by npm run test:grok:models.`);
  }
  if (!mock && ['grok-2-vision-latest', 'grok-2-vision-1212'].includes(configuredVisionModel)) {
    console.warn(`Warning: GROK_VISION_MODEL=${configuredVisionModel} may not be available for your xAI key. Try GROK_VISION_MODEL=grok-4 or run npm run test:grok:models.`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const imageSizeMb = imageBuffer.length / 1024 / 1024;
  const maxImageMb = Number(process.env.AI_ANALYSIS_MAX_IMAGE_MB || 1);

  console.log(`Image size: ${imageSizeMb.toFixed(2)} MB`);
  console.log(`Configured max image size: ${maxImageMb} MB`);

  const form = new FormData();
  form.append('mode', 'sensor_tape');
  form.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), path.basename(imagePath));

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form
  });

  const rawText = await response.text();
  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = rawText;
  }

  console.log(`Response: HTTP ${response.status}`);

  if (!response.ok) {
    console.error('Raw response:');
    console.error(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    throw new Error(`AI sensor installation smoke test failed with HTTP ${response.status}`);
  }

  console.log('Result:');
  console.log(JSON.stringify(payload, null, 2));

  const result = payload && payload.result;
  if (!result || typeof result.summary !== 'string') {
    throw new Error('Backend response does not contain result.summary');
  }

  console.log('✅ Grok sensor installation AI smoke test passed');
}

main().catch((error) => {
  console.error('❌ Grok sensor installation AI smoke test failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
