const fs = require("node:fs");
const path = require("node:path");

class NovaPoshtaApiError extends Error {
  constructor(message, payload = {}, status = 0) {
    super(message);
    this.name = "NovaPoshtaApiError";
    this.payload = payload;
    this.status = status;
    this.errors = payload.errors || [];
    this.warnings = payload.warnings || [];
    this.info = payload.info || [];
    this.errorCodes = payload.errorCodes || [];
    this.messageCodes = payload.messageCodes || [];
  }
}

class NovaPoshtaTtnSmokeTest {
  constructor(options = {}) {
    this.apiUrl = process.env.NOVA_POSHTA_API_URL || "https://api.novaposhta.ua/v2.0/json/";
    this.apiKey = process.env.NOVA_POSHTA_API_KEY;
    this.senderPhone = this.normalizePhone(process.env.NOVA_POSHTA_SENDER_PHONE || "");
    this.orderId = options.orderId || `NP-TEST-${Date.now()}`;
    this.defaultSenderCityRef =
      process.env.NOVA_POSHTA_SENDER_CITY_REF ||
      process.env.NP_TEST_SENDER_CITY_REF ||
      process.env.NP_TEST_RECIPIENT_CITY_REF ||
      "8d5a980d-391c-11dd-90d9-001a92567626";
    this.defaultSenderWarehouseRef =
      process.env.NOVA_POSHTA_SENDER_WAREHOUSE_REF ||
      process.env.NOVA_POSHTA_SENDER_ADDRESS_REF ||
      process.env.NP_TEST_SENDER_WAREHOUSE_REF ||
      process.env.NP_TEST_RECIPIENT_WAREHOUSE_REF ||
      "1ec09d88-e1c2-11e3-8c4a-0050568002cf";
  }

  static loadEnvFiles(rootDir = process.cwd()) {
    for (const fileName of [".env.local", ".env"]) {
      const filePath = path.join(rootDir, fileName);
      if (!fs.existsSync(filePath)) continue;

      const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

        const separatorIndex = trimmed.indexOf("=");
        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }

  validateEnv() {
    const missing = [];
    if (!this.apiKey) missing.push("NOVA_POSHTA_API_KEY");
    if (!this.senderPhone) missing.push("NOVA_POSHTA_SENDER_PHONE");

    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("380")) return digits;
    if (digits.startsWith("0")) return `38${digits}`;
    return digits;
  }

  formatNovaDate(date = new Date()) {
    return new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  createTestOrderPayload() {
    return {
      orderId: this.orderId,
      createdAt: new Date().toISOString(),
      amountUah: 1400,
      currency: "UAH",
      customer: {
        firstName: process.env.NP_TEST_RECIPIENT_FIRST_NAME || "Тест",
        lastName: process.env.NP_TEST_RECIPIENT_LAST_NAME || "Клієнт",
        middleName: process.env.NP_TEST_RECIPIENT_MIDDLE_NAME || "Тестович",
        phone: this.normalizePhone(process.env.NP_TEST_RECIPIENT_PHONE || "380993177636")
      },
      recipient: {
        cityRef:
          process.env.NP_TEST_RECIPIENT_CITY_REF || "8d5a980d-391c-11dd-90d9-001a92567626",
        warehouseRef:
          process.env.NP_TEST_RECIPIENT_WAREHOUSE_REF || "1ec09d88-e1c2-11e3-8c4a-0050568002cf"
      },
      items: [
        {
          sku: "SIBIONICS-GS3-SENSOR",
          name: "Sibionics GS3 sensor",
          quantity: 1,
          unitPriceUah: 900,
          lineTotalUah: 900
        },
        {
          sku: "SIBIONICS-GS3-TRANSPONDER",
          name: "Sibionics GS3 transponder",
          quantity: 1,
          unitPriceUah: 500,
          lineTotalUah: 500
        }
      ]
    };
  }

  async resolveRecipientCity(cityRef) {
    const payload = await this.request("Address", "getCities", {
      Ref: cityRef,
      Page: "1",
      Limit: "1"
    });

    const cities = Array.isArray(payload.data) ? payload.data : [];
    const city = cities.find(item => item.Ref === cityRef) || cities[0];

    if (!city?.Ref) {
      throw new Error(`Nova Poshta did not return recipient city by Ref: ${cityRef}`);
    }

    return city;
  }

  async resolveRecipientWarehouse(cityRef, warehouseRef) {
    const payload = await this.request("AddressGeneral", "getWarehouses", {
      CityRef: cityRef,
      Ref: warehouseRef,
      Page: "1",
      Limit: "1"
    });

    const warehouses = Array.isArray(payload.data) ? payload.data : [];
    let warehouse = warehouses.find(item => item.Ref === warehouseRef) || warehouses[0];

    if (!warehouse?.Ref) {
      const fallbackPayload = await this.request("AddressGeneral", "getWarehouses", {
        CityRef: cityRef,
        Page: "1",
        Limit: "1"
      });

      const fallbackWarehouses = Array.isArray(fallbackPayload.data) ? fallbackPayload.data : [];
      warehouse = fallbackWarehouses[0];

      if (!warehouse?.Ref) {
        throw new Error(
          `Nova Poshta did not return recipient warehouse for CityRef ${cityRef}. Check NP_TEST_RECIPIENT_WAREHOUSE_REF.`
        );
      }

      console.warn(
        `Recipient warehouse Ref ${warehouseRef} was not found for the city. Falling back to first warehouse: ${warehouse.Ref}`
      );
    }

    return warehouse;
  }

  async createRecipientCounterparty(order, recipientCity) {
    const payload = await this.request("Counterparty", "save", {
      CounterpartyProperty: "Recipient",
      CounterpartyType: "PrivatePerson",
      FirstName: order.customer.firstName,
      MiddleName: order.customer.middleName,
      LastName: order.customer.lastName,
      Phone: order.customer.phone,
      CityRef: recipientCity.Ref
    });

    const first = Array.isArray(payload.data) ? payload.data[0] || {} : {};
    const recipientRef = first.Ref;
    const contactRecipientRef =
      first.ContactPerson?.data?.[0]?.Ref ||
      first.ContactPersons?.[0]?.Ref ||
      first.ContactPersonRef;

    if (!recipientRef || !contactRecipientRef) {
      throw new NovaPoshtaApiError(
        "Nova Poshta did not return recipient counterparty/contact refs",
        payload,
        200
      );
    }

    return {
      recipientRef,
      contactRecipientRef,
      raw: first
    };
  }

  async resolveRecipientRefs(order) {
    const city = await this.resolveRecipientCity(order.recipient.cityRef);
    const warehouse = await this.resolveRecipientWarehouse(city.Ref, order.recipient.warehouseRef);
    const recipient = await this.createRecipientCounterparty(order, city);

    return {
      cityRef: city.Ref,
      cityName: city.Description || city.DescriptionRu || city.DescriptionTranslit || "",
      warehouseRef: warehouse.Ref,
      warehouseDescription: warehouse.Description || warehouse.DescriptionRu || "",
      recipientRef: recipient.recipientRef,
      contactRecipientRef: recipient.contactRecipientRef
    };
  }

  async request(modelName, calledMethod, methodProperties = {}) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Sibionics GS3 Nova Poshta TTN smoke test"
      },
      body: JSON.stringify({
        apiKey: this.apiKey,
        modelName,
        calledMethod,
        methodProperties
      })
    });

    const rawText = await response.text();
    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      throw new Error(`Nova Poshta returned non-JSON response: ${rawText.slice(0, 500)}`);
    }

    if (!response.ok || payload.success === false) {
      const detail = [
        ...(payload.errors || []),
        ...(payload.warnings || []),
        ...(payload.info || []),
        ...(payload.errorCodes || []),
        ...(payload.messageCodes || [])
      ]
        .filter(Boolean)
        .join("; ");

      throw new NovaPoshtaApiError(
        detail || `Nova Poshta API request failed: HTTP ${response.status}`,
        payload,
        response.status
      );
    }

    return payload;
  }

  async getSenderCounterparty() {
    const payload = await this.request("Counterparty", "getCounterparties", {
      CounterpartyProperty: "Sender",
      Page: "1"
    });

    const sender = Array.isArray(payload.data) ? payload.data[0] : null;
    if (!sender?.Ref) {
      throw new Error("Nova Poshta did not return sender counterparty. Check the API key account settings.");
    }

    return sender;
  }

  async getSenderContact(senderRef) {
    const payload = await this.request("Counterparty", "getCounterpartyContactPersons", {
      Ref: senderRef,
      Page: "1"
    });

    const contacts = Array.isArray(payload.data) ? payload.data : [];
    const contact =
      contacts.find(item => this.normalizePhone(item.Phones || item.Phone || "") === this.senderPhone) ||
      contacts[0];

    if (!contact?.Ref) {
      throw new Error("Nova Poshta did not return sender contact person for this API key.");
    }

    return contact;
  }

  async getSenderAddress(senderRef) {
    const payload = await this.request("Counterparty", "getCounterpartyAddresses", {
      Ref: senderRef,
      CounterpartyProperty: "Sender",
      Page: "1"
    });

    const addresses = Array.isArray(payload.data) ? payload.data : [];
    const address = addresses[0];

    if (address?.Ref) {
      const cityRef = address.CityRef || address.SettlementRef || address.City || address.Settlement;
      if (!cityRef) {
        console.warn(
          "Nova Poshta returned a sender address without CityRef/SettlementRef. Falling back to configured sender city ref."
        );
      }

      return {
        ref: address.Ref,
        cityRef: cityRef || this.defaultSenderCityRef,
        source: "counterparty-address",
        raw: address
      };
    }

    console.warn(
      "Nova Poshta did not return saved sender addresses for this account. Falling back to sender warehouse refs."
    );

    const fallbackWarehouse = await this.resolveFallbackSenderWarehouse();
    return {
      ref: fallbackWarehouse.warehouseRef,
      cityRef: fallbackWarehouse.cityRef,
      source: fallbackWarehouse.source,
      raw: fallbackWarehouse.raw
    };
  }

  async resolveFallbackSenderWarehouse() {
    if (this.defaultSenderCityRef && this.defaultSenderWarehouseRef) {
      return {
        cityRef: this.defaultSenderCityRef,
        warehouseRef: this.defaultSenderWarehouseRef,
        source: "env-or-default-sender-warehouse",
        raw: null
      };
    }

    const payload = await this.request("AddressGeneral", "getWarehouses", {
      CityRef: this.defaultSenderCityRef,
      Page: "1",
      Limit: "1"
    });

    const warehouses = Array.isArray(payload.data) ? payload.data : [];
    const warehouse = warehouses[0];

    if (!warehouse?.Ref) {
      throw new Error(
        "Nova Poshta did not return sender warehouse fallback. Add a sender warehouse/address in the Nova Poshta cabinet or set NOVA_POSHTA_SENDER_CITY_REF and NOVA_POSHTA_SENDER_WAREHOUSE_REF."
      );
    }

    return {
      cityRef: this.defaultSenderCityRef,
      warehouseRef: warehouse.Ref,
      source: "address-general-first-warehouse",
      raw: warehouse
    };
  }

  async resolveSenderRefs() {
    const sender = await this.getSenderCounterparty();
    const contact = await this.getSenderContact(sender.Ref);
    const address = await this.getSenderAddress(sender.Ref);

    return {
      senderRef: sender.Ref,
      senderDescription: sender.Description || sender.FirstName || "Sender",
      contactSenderRef: contact.Ref,
      contactDescription: contact.Description || `${contact.LastName || ""} ${contact.FirstName || ""}`.trim(),
      senderAddressRef: address.ref,
      citySenderRef: address.cityRef,
      senderAddressSource: address.source || "counterparty-address"
    };
  }

  buildInternetDocumentPayload(order, senderRefs, recipientRefs) {
    return {
      NewAddress: "1",
      // The smoke test intentionally does not reuse the main app payment config.
      // Recipient + Cash is the safest manual test combination for warehouse-to-warehouse TTN creation.
      PayerType: process.env.NP_TEST_NOVA_POSHTA_PAYER_TYPE || "Recipient",
      PaymentMethod: process.env.NP_TEST_NOVA_POSHTA_PAYMENT_METHOD || "Cash",
      CargoType: process.env.NOVA_POSHTA_CARGO_TYPE || "Parcel",
      VolumeGeneral: process.env.NOVA_POSHTA_DEFAULT_VOLUME || "0.002",
      Weight: process.env.NOVA_POSHTA_DEFAULT_WEIGHT_KG || "0.5",
      ServiceType: process.env.NOVA_POSHTA_SERVICE_TYPE || "WarehouseWarehouse",
      SeatsAmount: process.env.NOVA_POSHTA_SEATS_AMOUNT || "1",
      Description: `Sibionics GS3 test order ${order.orderId}`.slice(0, 100),
      Cost: String(Math.max(1, Math.round(order.amountUah))),
      CitySender: senderRefs.citySenderRef,
      Sender: senderRefs.senderRef,
      SenderAddress: senderRefs.senderAddressRef,
      ContactSender: senderRefs.contactSenderRef,
      SendersPhone: this.senderPhone,
      CityRecipient: recipientRefs.cityRef,
      Recipient: recipientRefs.recipientRef,
      RecipientAddress: recipientRefs.warehouseRef,
      ContactRecipient: recipientRefs.contactRecipientRef,
      RecipientsPhone: order.customer.phone,
      DateTime: process.env.NOVA_POSHTA_DATE || this.formatNovaDate()
    };
  }

  async createTtn(order, senderRefs, recipientRefs) {
    const methodProperties = this.buildInternetDocumentPayload(order, senderRefs, recipientRefs);
    const payload = await this.request("InternetDocument", "save", methodProperties);
    const first = Array.isArray(payload.data) ? payload.data[0] || {} : {};
    const ttn = first.IntDocNumber || first.Number || first.DocumentNumber;

    if (!ttn) {
      throw new NovaPoshtaApiError("Nova Poshta did not return IntDocNumber for created TTN", payload, 200);
    }

    return {
      ttn,
      ref: first.Ref,
      raw: payload
    };
  }

  printApiMessages(error) {
    const payload = error?.payload || {};
    const sections = [
      ["errors", error?.errors || payload.errors || []],
      ["warnings", error?.warnings || payload.warnings || []],
      ["info", error?.info || payload.info || []],
      ["errorCodes", error?.errorCodes || payload.errorCodes || []],
      ["messageCodes", error?.messageCodes || payload.messageCodes || []]
    ];

    for (const [title, values] of sections) {
      if (!values.length) continue;
      console.error(`${title}:`);
      for (const value of values) {
        console.error(`- ${value}`);
      }
    }
  }

  async run() {
    this.validateEnv();

    const order = this.createTestOrderPayload();

    console.log("Nova Poshta TTN smoke test");
    console.log(`Order ID: ${order.orderId}`);
    console.log(`Recipient: ${order.customer.lastName} ${order.customer.firstName} ${order.customer.middleName}`);
    console.log(`Recipient phone: ${order.customer.phone}`);
    console.log(`Recipient city ref: ${order.recipient.cityRef}`);
    console.log(`Recipient warehouse ref: ${order.recipient.warehouseRef}`);
    console.log(`Cost: ${order.amountUah} UAH`);
    console.log("");

    console.log("Resolving sender data from Nova Poshta account...");
    const senderRefs = await this.resolveSenderRefs();
    console.log(`Sender: ${senderRefs.senderDescription}`);
    console.log(`Sender ref: ${senderRefs.senderRef}`);
    console.log(`Sender city ref: ${senderRefs.citySenderRef}`);
    console.log(`Sender address ref: ${senderRefs.senderAddressRef}`);
    console.log(`Sender address source: ${senderRefs.senderAddressSource}`);
    console.log(`Contact sender ref: ${senderRefs.contactSenderRef}`);
    console.log("");

    console.log("Resolving recipient city, warehouse and counterparty...");
    const recipientRefs = await this.resolveRecipientRefs(order);
    console.log(`Recipient city: ${recipientRefs.cityName || recipientRefs.cityRef}`);
    console.log(`Recipient city ref: ${recipientRefs.cityRef}`);
    console.log(`Recipient warehouse: ${recipientRefs.warehouseDescription || recipientRefs.warehouseRef}`);
    console.log(`Recipient warehouse ref: ${recipientRefs.warehouseRef}`);
    console.log(`Recipient ref: ${recipientRefs.recipientRef}`);
    console.log(`Contact recipient ref: ${recipientRefs.contactRecipientRef}`);
    console.log("");

    console.log("Creating Nova Poshta TTN...");
    const result = await this.createTtn(order, senderRefs, recipientRefs);

    console.log(`✅ TTN created: ${result.ttn}`);
    if (result.ref) console.log(`Document ref: ${result.ref}`);
    if (result.raw?.warnings?.length) {
      console.log("warnings:");
      for (const warning of result.raw.warnings) console.log(`- ${warning}`);
    }
    if (result.raw?.info?.length) {
      console.log("info:");
      for (const info of result.raw.info) console.log(`- ${info}`);
    }

    return result;
  }
}

module.exports = {
  NovaPoshtaTtnSmokeTest,
  NovaPoshtaApiError
};
