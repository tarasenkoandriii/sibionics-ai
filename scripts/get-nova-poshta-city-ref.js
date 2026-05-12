#!/usr/bin/env node
/*
  Resolve Nova Poshta RECIPIENT_CITY_REF and first RECIPIENT_WAREHOUSE_REF
  for a city name, Kyiv by default.

  Usage:
    npm run np:city-ref
    npm run np:city-ref -- Київ
    npm run np:city-ref -- Киев
    npm run np:city-ref -- Kyiv

  Reads .env.local and .env if they exist. NOVA_POSHTA_API_KEY is optional for
  public directory reads in many Nova Poshta setups, but if present it will be
  sent with all requests.
*/

const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

const cityQuery = process.argv.slice(2).join(" ").trim() || process.env.NP_CITY_REF_QUERY || "Київ";
const apiUrl = process.env.NOVA_POSHTA_API_URL || "https://api.novaposhta.ua/v2.0/json/";
const apiKey = process.env.NOVA_POSHTA_API_KEY || "";
const warehouseLimit = process.env.NP_WAREHOUSE_LOOKUP_LIMIT || "1";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['ʼ’`]/g, "")
    .replace(/ё/g, "е")
    .replace(/ї/g, "і")
    .replace(/\s+/g, " ");
}

function isKyivRecord(city) {
  const values = [
    city.Description,
    city.DescriptionRu,
    city.DescriptionTranslit,
    city.SettlementTypeDescription,
    city.SettlementTypeDescriptionRu
  ].map(normalize);

  return values.includes("київ") || values.includes("киев") || values.includes("kyiv") || values.includes("kiev");
}

function formatCity(city, index) {
  const parts = [
    `${index + 1}. ${city.Description || "-"}`,
    city.DescriptionRu ? `ru: ${city.DescriptionRu}` : null,
    city.AreaDescription ? `area: ${city.AreaDescription}` : null,
    city.Ref ? `Ref: ${city.Ref}` : null,
    city.DeliveryCity ? `DeliveryCity: ${city.DeliveryCity}` : null,
    city.CityID ? `CityID: ${city.CityID}` : null
  ].filter(Boolean);

  return parts.join(" | ");
}

function formatWarehouse(warehouse, index) {
  const parts = [
    `${index + 1}. ${warehouse.Description || warehouse.DescriptionRu || "-"}`,
    warehouse.Number ? `Number: ${warehouse.Number}` : null,
    warehouse.Ref ? `Ref: ${warehouse.Ref}` : null,
    warehouse.CityRef ? `CityRef: ${warehouse.CityRef}` : null,
    warehouse.ShortAddress ? `Address: ${warehouse.ShortAddress}` : null
  ].filter(Boolean);

  return parts.join(" | ");
}

async function novaPoshtaRequest(modelName, calledMethod, methodProperties) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Sibionics GS3 Nova Poshta ref lookup script"
    },
    body: JSON.stringify({
      apiKey,
      modelName,
      calledMethod,
      methodProperties
    })
  });

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Nova Poshta returned non-JSON response: ${raw.slice(0, 500)}`);
  }

  if (!response.ok || payload.success === false) {
    const details = [
      ...(payload.errors || []),
      ...(payload.warnings || []),
      ...(payload.info || []),
      ...(payload.errorCodes || []),
      ...(payload.messageCodes || [])
    ].filter(Boolean);
    throw new Error(details.length ? details.join("; ") : `Nova Poshta HTTP ${response.status}`);
  }

  return payload;
}

async function lookupCities() {
  const payload = await novaPoshtaRequest("Address", "getCities", {
    FindByString: cityQuery,
    Limit: "20",
    Page: "1"
  });

  return Array.isArray(payload.data) ? payload.data : [];
}

async function lookupWarehousesByCityRef(cityRef) {
  const payload = await novaPoshtaRequest("AddressGeneral", "getWarehouses", {
    CityRef: cityRef,
    Limit: warehouseLimit,
    Page: "1"
  });

  return Array.isArray(payload.data) ? payload.data : [];
}

async function lookupFirstWarehouse(selectedCity) {
  const candidateRefs = [selectedCity.Ref, selectedCity.DeliveryCity].filter(Boolean);
  const uniqueRefs = [...new Set(candidateRefs)];

  for (const cityRef of uniqueRefs) {
    const warehouses = await lookupWarehousesByCityRef(cityRef);
    if (warehouses.length) {
      return {
        cityRef,
        warehouses,
        warehouse: warehouses[0]
      };
    }
  }

  return {
    cityRef: uniqueRefs[0] || "",
    warehouses: [],
    warehouse: null
  };
}

async function main() {
  console.log("Nova Poshta city + first warehouse ref lookup");
  console.log(`Query: ${cityQuery}`);
  console.log(`Endpoint: ${apiUrl}`);
  console.log(`API key: ${apiKey ? "present" : "empty (allowed for public directories in many setups)"}`);
  console.log("");

  const cities = await lookupCities();
  if (!cities.length) {
    console.log("No cities found. Try another query:");
    console.log("  npm run np:city-ref -- Киев");
    console.log("  npm run np:city-ref -- Kyiv");
    process.exitCode = 1;
    return;
  }

  const selectedCity = cities.find(isKyivRecord) || cities[0];
  const cityRef = selectedCity.Ref || selectedCity.DeliveryCity;

  console.log("Found cities:");
  cities.forEach((city, index) => console.log(formatCity(city, index)));
  console.log("");

  if (!cityRef) {
    console.log("Nova Poshta response did not contain Ref/DeliveryCity for the selected city.");
    process.exitCode = 1;
    return;
  }

  console.log("Selected city:");
  console.log(formatCity(selectedCity, 0));
  console.log("");

  const warehouseResult = await lookupFirstWarehouse(selectedCity);
  const firstWarehouse = warehouseResult.warehouse;

  if (!firstWarehouse?.Ref) {
    console.log(`No warehouses found for selected city refs: ${[selectedCity.Ref, selectedCity.DeliveryCity].filter(Boolean).join(", ")}`);
    console.log("Try another city query or check Nova Poshta directory availability.");
    process.exitCode = 1;
    return;
  }

  console.log("First warehouse found:");
  console.log(formatWarehouse(firstWarehouse, 0));
  console.log("");

  console.log("Use this in .env.local for test recipient:");
  console.log(`RECIPIENT_CITY_REF=${warehouseResult.cityRef}`);
  console.log(`RECIPIENT_WAREHOUSE_REF=${firstWarehouse.Ref}`);
  console.log("");
  console.log("For the existing project TTN test vars you can also set:");
  console.log(`NP_TEST_RECIPIENT_CITY_REF=${warehouseResult.cityRef}`);
  console.log(`NP_TEST_RECIPIENT_WAREHOUSE_REF=${firstWarehouse.Ref}`);
  console.log("");
  console.log("Optional readable values:");
  console.log(`NP_TEST_RECIPIENT_CITY_NAME=${selectedCity.Description || cityQuery}`);
  console.log(`NP_TEST_RECIPIENT_WAREHOUSE_DESCRIPTION=${firstWarehouse.Description || firstWarehouse.DescriptionRu || ""}`);
}

main().catch((error) => {
  console.error("Nova Poshta city/warehouse ref lookup failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
