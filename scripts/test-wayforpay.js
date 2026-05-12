#!/usr/bin/env node
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || "test_merch_n1";
const secretKey = process.env.WAYFORPAY_MERCHANT_SECRET_KEY || "flk3409refn54t54t*FNJRET";
const merchantDomainName = process.env.WAYFORPAY_MERCHANT_DOMAIN_NAME || "www.market.ua";
const purchaseUrl = process.env.WAYFORPAY_PURCHASE_URL || "https://secure.wayforpay.com/pay";
const orderReference = `WFP-TEST-${Date.now()}`;
const orderDate = Math.floor(Date.now() / 1000);
const amount = "1400";
const currency = "UAH";
const productName = ["Sibionics GS3 test sensor", "Sibionics GS3 test transponder"];
const productCount = [1, 1];
const productPrice = [900, 500];

function signature() {
  const baseString = [
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount,
    currency,
    ...productName,
    ...productCount.map(String),
    ...productPrice.map(String)
  ].join(";");
  return crypto.createHmac("md5", secretKey).update(baseString, "utf8").digest("hex");
}

function append(form, key, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => form.append(`${key}[]`, String(item)));
  } else if (value !== undefined && value !== null && value !== "") {
    form.append(key, String(value));
  }
}

async function main() {
  console.log("WayForPay sandbox smoke test");
  console.log(`Endpoint: ${purchaseUrl}?behavior=offline`);
  console.log(`Merchant account: ${merchantAccount}`);
  console.log(`Merchant domain: ${merchantDomainName}`);
  console.log(`Order reference: ${orderReference}`);
  console.log("");

  const payload = {
    merchantAccount,
    merchantAuthType: "SimpleSignature",
    merchantDomainName,
    merchantTransactionType: "AUTO",
    merchantTransactionSecureType: "AUTO",
    merchantSignature: signature(),
    apiVersion: 2,
    language: "UA",
    returnUrl: process.env.WAYFORPAY_RETURN_URL || "https://example.com/payment/success",
    serviceUrl: process.env.WAYFORPAY_SERVICE_URL || "https://example.com/api/payments/wayforpay/callback",
    orderReference,
    orderDate,
    amount,
    currency,
    orderTimeout: 49000,
    productName,
    productPrice,
    productCount,
    clientFirstName: "Тест",
    clientLastName: "Клієнт",
    clientEmail: "test@example.com",
    clientPhone: "380993177636",
    defaultPaymentSystem: "card"
  };

  const form = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => append(form, key, value));

  const response = await fetch(`${purchaseUrl}?behavior=offline`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
    body: form.toString()
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  console.log(`WayForPay response: HTTP ${response.status}`);
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) throw new Error(`WayForPay HTTP ${response.status}`);
  if (!data || !data.url) throw new Error("WayForPay did not return payment url");

  console.log("");
  console.log(`✅ Payment URL: ${data.url}`);
}

main().catch((error) => {
  console.error("");
  console.error("❌ WayForPay sandbox smoke test failed");
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
