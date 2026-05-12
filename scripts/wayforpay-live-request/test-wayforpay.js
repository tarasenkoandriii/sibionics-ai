#!/usr/bin/env node
const { WayForPaySmokeTest } = require("./classes/WayForPaySmokeTest");

async function main() {
  const test = new WayForPaySmokeTest();
  await test.run();
}

main().catch((error) => {
  console.error("");
  console.error("❌ WayForPay full smoke test failed");
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
