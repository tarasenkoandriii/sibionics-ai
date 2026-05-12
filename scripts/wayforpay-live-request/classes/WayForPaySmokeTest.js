const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PURCHASE_URL = "https://secure.wayforpay.com/pay";
const DEFAULT_API_URL = "https://api.wayforpay.com/api";
const DEFAULT_TEST_MERCHANT_ACCOUNT = "test_merch_n1";
const DEFAULT_TEST_SECRET_KEY = "flk3409refn54t54t*FNJRET";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "y", "on"].includes(String(raw).toLowerCase());
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function hmacMd5(secretKey, baseString) {
  return crypto.createHmac("md5", secretKey).update(baseString, "utf8").digest("hex");
}

function redact(value, keepStart = 5, keepEnd = 4) {
  const text = String(value || "");
  if (!text) return "(empty)";
  if (text.length <= keepStart + keepEnd) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, keepStart)}***${text.slice(-keepEnd)}`;
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid amount: ${value}`);
  return n.toFixed(2).replace(/\.00$/, "");
}

function appendFormField(form, key, value) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const item of value) form.append(`${key}[]`, String(item));
  } else {
    form.append(key, String(value));
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponse(response) {
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { text, json };
}

class WayForPaySmokeTest {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.startedAt = new Date();
    this.report = {
      test: "wayforpay-smoke-test",
      startedAt: this.startedAt.toISOString(),
      steps: [],
      config: {},
      result: "unknown"
    };
  }

  loadEnv() {
    const loaded = [
      path.join(this.cwd, ".env.local"),
      path.join(this.cwd, ".env")
    ].filter(loadEnvFile);

    this.report.envFilesLoaded = loaded.map((file) => path.relative(this.cwd, file));
    return loaded;
  }

  getConfig() {
    const useTestCredentials = boolEnv("WAYFORPAY_USE_TEST_CREDENTIALS", false);
    const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || (useTestCredentials ? DEFAULT_TEST_MERCHANT_ACCOUNT : "");
    const secretKey = process.env.WAYFORPAY_MERCHANT_SECRET_KEY || (useTestCredentials ? DEFAULT_TEST_SECRET_KEY : "");
    const merchantPassword = process.env.WAYFORPAY_MERCHANT_PASSWORD || "";
    const merchantDomainName = process.env.WAYFORPAY_MERCHANT_DOMAIN_NAME || "www.market.ua";
    const purchaseUrl = process.env.WAYFORPAY_PURCHASE_URL || DEFAULT_PURCHASE_URL;
    const apiUrl = process.env.WAYFORPAY_API_URL || DEFAULT_API_URL;
    const returnUrl = process.env.WAYFORPAY_RETURN_URL || "https://example.com/payment/success";
    const serviceUrl = process.env.WAYFORPAY_SERVICE_URL || "https://example.com/api/payments/wayforpay/callback";
    const timeoutMs = Number(process.env.WAYFORPAY_TEST_TIMEOUT_MS || 30000);
    const runCheckStatus = boolEnv("WAYFORPAY_TEST_RUN_CHECK_STATUS", true);
    const runLocalCallback = boolEnv("WAYFORPAY_TEST_RUN_LOCAL_CALLBACK", false);
    const saveReport = boolEnv("WAYFORPAY_TEST_SAVE_REPORT", true);
    const clientPhone = process.env.WAYFORPAY_TEST_CLIENT_PHONE || "380993177636";
    const clientEmail = process.env.WAYFORPAY_TEST_CLIENT_EMAIL || "test@example.com";
    const orderReference = process.env.WAYFORPAY_TEST_ORDER_REFERENCE || `WFP-SMOKE-${Date.now()}`;

    return {
      useTestCredentials,
      merchantAccount,
      secretKey,
      merchantPassword,
      merchantDomainName,
      purchaseUrl,
      apiUrl,
      returnUrl,
      serviceUrl,
      timeoutMs,
      runCheckStatus,
      runLocalCallback,
      saveReport,
      orderReference,
      orderDate: Math.floor(Date.now() / 1000),
      amount: formatAmount(process.env.WAYFORPAY_TEST_AMOUNT || 1400),
      currency: process.env.WAYFORPAY_TEST_CURRENCY || "UAH",
      productName: [
        process.env.WAYFORPAY_TEST_PRODUCT_1_NAME || "Sibionics GS3 test sensor",
        process.env.WAYFORPAY_TEST_PRODUCT_2_NAME || "Sibionics GS3 test transponder"
      ],
      productCount: [
        Number(process.env.WAYFORPAY_TEST_PRODUCT_1_COUNT || 1),
        Number(process.env.WAYFORPAY_TEST_PRODUCT_2_COUNT || 1)
      ],
      productPrice: [
        formatAmount(process.env.WAYFORPAY_TEST_PRODUCT_1_PRICE || 900),
        formatAmount(process.env.WAYFORPAY_TEST_PRODUCT_2_PRICE || 500)
      ],
      clientFirstName: process.env.WAYFORPAY_TEST_CLIENT_FIRST_NAME || "Тест",
      clientLastName: process.env.WAYFORPAY_TEST_CLIENT_LAST_NAME || "Клієнт",
      clientEmail,
      clientPhone,
      language: process.env.WAYFORPAY_LANGUAGE || "UA",
      defaultPaymentSystem: process.env.WAYFORPAY_DEFAULT_PAYMENT_SYSTEM || "card",
      paymentSystems: process.env.WAYFORPAY_PAYMENT_SYSTEMS || "card;googlePay;applePay",
      orderTimeout: Number(process.env.WAYFORPAY_ORDER_TIMEOUT_SECONDS || 49000)
    };
  }

  addStep(name, status, details = {}) {
    const step = {
      name,
      status,
      at: new Date().toISOString(),
      ...details
    };
    this.report.steps.push(step);
    return step;
  }

  validateConfig(config) {
    const missing = [];
    if (!config.merchantAccount) missing.push("WAYFORPAY_MERCHANT_ACCOUNT");
    if (!config.secretKey) missing.push("WAYFORPAY_MERCHANT_SECRET_KEY");
    if (!config.merchantDomainName) missing.push("WAYFORPAY_MERCHANT_DOMAIN_NAME");
    if (!config.purchaseUrl) missing.push("WAYFORPAY_PURCHASE_URL");
    if (!config.apiUrl) missing.push("WAYFORPAY_API_URL");

    const amountByItems = config.productCount.reduce((sum, count, index) => {
      return sum + Number(count) * Number(config.productPrice[index]);
    }, 0);

    const amountMatchesItems = Number(config.amount) === Number(formatAmount(amountByItems));

    this.report.config = {
      useTestCredentials: config.useTestCredentials,
      merchantAccount: config.merchantAccount,
      merchantSecretKey: redact(config.secretKey),
      merchantPasswordPresent: Boolean(config.merchantPassword),
      merchantPassword: config.merchantPassword ? redact(config.merchantPassword) : "(not set)",
      merchantDomainName: config.merchantDomainName,
      purchaseUrl: config.purchaseUrl,
      apiUrl: config.apiUrl,
      returnUrl: config.returnUrl,
      serviceUrl: config.serviceUrl,
      orderReference: config.orderReference,
      amount: config.amount,
      currency: config.currency,
      products: config.productName.map((name, index) => ({
        name,
        count: config.productCount[index],
        price: config.productPrice[index]
      })),
      amountByItems: formatAmount(amountByItems),
      amountMatchesItems
    };

    if (missing.length) {
      throw new Error(`Missing required WayForPay env variables: ${missing.join(", ")}`);
    }
    if (!amountMatchesItems) {
      throw new Error(`WAYFORPAY_TEST_AMOUNT (${config.amount}) does not match product total (${formatAmount(amountByItems)})`);
    }
    this.addStep("config", "ok", { missing, amountMatchesItems });
  }

  createPurchaseBaseString(config) {
    return [
      config.merchantAccount,
      config.merchantDomainName,
      config.orderReference,
      config.orderDate,
      config.amount,
      config.currency,
      ...config.productName,
      ...config.productCount.map(String),
      ...config.productPrice.map(String)
    ].join(";");
  }

  createPurchaseSignature(config) {
    return hmacMd5(config.secretKey, this.createPurchaseBaseString(config));
  }

  createCheckStatusSignature(config) {
    return hmacMd5(config.secretKey, [config.merchantAccount, config.orderReference].join(";"));
  }

  createCallbackSignature(config, callbackPayload) {
    const baseString = [
      callbackPayload.merchantAccount,
      callbackPayload.orderReference,
      callbackPayload.amount,
      callbackPayload.currency,
      callbackPayload.authCode,
      callbackPayload.cardPan,
      callbackPayload.transactionStatus,
      callbackPayload.reasonCode
    ].map((value) => String(value ?? "")).join(";");
    return hmacMd5(config.secretKey, baseString);
  }

  createServiceResponseSignature(config, orderReference, status, time) {
    return hmacMd5(config.secretKey, [orderReference, status, time].join(";"));
  }

  verifySignatureHelpers(config) {
    const purchaseBaseString = this.createPurchaseBaseString(config);
    const merchantSignature = this.createPurchaseSignature(config);
    const checkStatusSignature = this.createCheckStatusSignature(config);

    const simulatedCallback = {
      merchantAccount: config.merchantAccount,
      orderReference: config.orderReference,
      amount: config.amount,
      currency: config.currency,
      authCode: "541963",
      cardPan: "4102****8217",
      transactionStatus: "Approved",
      reasonCode: "1100"
    };
    simulatedCallback.merchantSignature = this.createCallbackSignature(config, simulatedCallback);

    const serviceTime = Math.floor(Date.now() / 1000);
    const serviceResponse = {
      orderReference: config.orderReference,
      status: "accept",
      time: serviceTime,
      signature: this.createServiceResponseSignature(config, config.orderReference, "accept", serviceTime)
    };

    this.addStep("signatures", "ok", {
      purchaseBaseString,
      purchaseSignature: merchantSignature,
      checkStatusSignature,
      simulatedCallbackSignature: simulatedCallback.merchantSignature,
      serviceResponse
    });

    return { merchantSignature, simulatedCallback, serviceResponse };
  }

  buildPurchasePayload(config, merchantSignature) {
    return {
      merchantAccount: config.merchantAccount,
      merchantAuthType: "SimpleSignature",
      merchantDomainName: config.merchantDomainName,
      merchantTransactionType: "AUTO",
      merchantTransactionSecureType: "AUTO",
      merchantSignature,
      apiVersion: 2,
      language: config.language,
      returnUrl: config.returnUrl,
      serviceUrl: config.serviceUrl,
      orderReference: config.orderReference,
      orderDate: config.orderDate,
      amount: config.amount,
      currency: config.currency,
      orderTimeout: config.orderTimeout,
      productName: config.productName,
      productPrice: config.productPrice,
      productCount: config.productCount,
      clientFirstName: config.clientFirstName,
      clientLastName: config.clientLastName,
      clientEmail: config.clientEmail,
      clientPhone: config.clientPhone,
      defaultPaymentSystem: config.defaultPaymentSystem,
      paymentSystems: config.paymentSystems
    };
  }

  async createOfflinePurchase(config, merchantSignature) {
    const payload = this.buildPurchasePayload(config, merchantSignature);
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) appendFormField(form, key, value);

    const endpoint = `${config.purchaseUrl}?behavior=offline`;
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": "Sibionics GS3 WayForPay smoke test"
      },
      body: form.toString()
    }, config.timeoutMs);

    const { text, json } = await readResponse(response);
    const paymentUrl = json && (json.url || json.invoiceUrl || json.checkoutUrl || json.redirectUrl);

    this.addStep("offline-purchase", response.ok && paymentUrl ? "ok" : "failed", {
      endpoint,
      httpStatus: response.status,
      response: json || text,
      paymentUrl: paymentUrl || null
    });

    if (!response.ok) {
      throw new Error(`WayForPay Purchase HTTP ${response.status}: ${text}`);
    }
    if (!paymentUrl) {
      throw new Error(`WayForPay Purchase did not return payment URL: ${text}`);
    }
    return { payload, response: json || text, paymentUrl };
  }

  async checkStatus(config) {
    const request = {
      transactionType: "CHECK_STATUS",
      merchantAccount: config.merchantAccount,
      orderReference: config.orderReference,
      merchantSignature: this.createCheckStatusSignature(config),
      apiVersion: 2
    };

    const response = await fetchWithTimeout(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Sibionics GS3 WayForPay smoke test"
      },
      body: JSON.stringify(request)
    }, config.timeoutMs);

    const { text, json } = await readResponse(response);
    this.addStep("check-status", response.ok ? "ok" : "failed", {
      endpoint: config.apiUrl,
      httpStatus: response.status,
      request: { ...request, merchantSignature: `${request.merchantSignature.slice(0, 8)}...` },
      response: json || text
    });

    if (!response.ok) {
      throw new Error(`WayForPay CHECK_STATUS HTTP ${response.status}: ${text}`);
    }
    return json || text;
  }

  async callLocalCallbackIfEnabled(config, simulatedCallback) {
    if (!config.runLocalCallback) {
      this.addStep("local-callback", "skipped", { reason: "Set WAYFORPAY_TEST_RUN_LOCAL_CALLBACK=true to POST simulated callback to WAYFORPAY_SERVICE_URL." });
      return null;
    }

    const response = await fetchWithTimeout(config.serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Sibionics GS3 WayForPay smoke test"
      },
      body: JSON.stringify(simulatedCallback)
    }, config.timeoutMs);

    const { text, json } = await readResponse(response);
    this.addStep("local-callback", response.ok ? "ok" : "failed", {
      endpoint: config.serviceUrl,
      httpStatus: response.status,
      response: json || text
    });
    if (!response.ok) throw new Error(`Local callback HTTP ${response.status}: ${text}`);
    return json || text;
  }

  saveReportIfNeeded(config) {
    this.report.finishedAt = new Date().toISOString();
    this.report.durationMs = new Date(this.report.finishedAt).getTime() - this.startedAt.getTime();
    if (!config.saveReport) return null;

    const dir = path.join(this.cwd, "scripts", "reports");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `wayforpay-smoke-${config.orderReference}.json`);
    fs.writeFileSync(file, JSON.stringify(this.report, null, 2));
    this.report.reportFile = path.relative(this.cwd, file);
    return file;
  }

  async run() {
    this.loadEnv();
    const config = this.getConfig();

    console.log("WayForPay full smoke test");
    console.log(`Merchant account: ${config.merchantAccount || "(missing)"}`);
    console.log(`Merchant domain: ${config.merchantDomainName}`);
    console.log(`Purchase endpoint: ${config.purchaseUrl}?behavior=offline`);
    console.log(`API endpoint: ${config.apiUrl}`);
    console.log(`Order reference: ${config.orderReference}`);
    console.log("");

    try {
      this.validateConfig(config);
      const { merchantSignature, simulatedCallback } = this.verifySignatureHelpers(config);
      const purchaseResult = await this.createOfflinePurchase(config, merchantSignature);

      if (config.runCheckStatus) {
        await this.checkStatus(config);
      } else {
        this.addStep("check-status", "skipped", { reason: "WAYFORPAY_TEST_RUN_CHECK_STATUS=false" });
      }

      await this.callLocalCallbackIfEnabled(config, simulatedCallback);

      this.report.result = "ok";
      this.report.paymentUrl = purchaseResult.paymentUrl;
      const reportFile = this.saveReportIfNeeded(config);

      console.log("✅ WayForPay connection test passed");
      console.log(`Payment URL: ${purchaseResult.paymentUrl}`);
      if (reportFile) console.log(`Report: ${path.relative(this.cwd, reportFile)}`);
      return this.report;
    } catch (error) {
      this.report.result = "failed";
      this.report.error = error && error.message ? error.message : String(error);
      const reportFile = this.saveReportIfNeeded(config);
      if (reportFile) console.error(`Report: ${path.relative(this.cwd, reportFile)}`);
      throw error;
    }
  }
}

module.exports = {
  WayForPaySmokeTest,
  loadEnvFile,
  hmacMd5
};
