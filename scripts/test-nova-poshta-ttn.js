#!/usr/bin/env node
const { NovaPoshtaTtnSmokeTest } = require("./classes/NovaPoshtaTtnSmokeTest");

NovaPoshtaTtnSmokeTest.loadEnvFiles(process.cwd());

const test = new NovaPoshtaTtnSmokeTest();

test.run().catch(error => {
  console.error("❌ Nova Poshta TTN smoke test failed");
  console.error(error instanceof Error ? error.message : String(error));

  if (typeof test.printApiMessages === "function") {
    test.printApiMessages(error);
  }

  process.exitCode = 1;
});
