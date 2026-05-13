export type DeliveryService = "nova_poshta" | "ukrposhta";
export type PaymentProvider = "wayforpay" | "hutko";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "ttn_created"
  | "ttn_failed";

export type DeliveryDetails = {
  service: DeliveryService;
  serviceLabel: string;
  city: string;
  branch: string;
  postalCode?: string;
  novaCityRef?: string;
  novaWarehouseRef?: string;
};

export type CustomerDetails = {
  name: string;
  phone: string;
  email?: string;
};

export type TelegramOrderPreferences = {
  notifyOrderUpdates: boolean;
  addToTelegramGroup: boolean;
};

export type OrderItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPriceUah: number;
  lineTotalUah: number;
};

export type ShipmentResult = {
  provider: DeliveryService;
  status: "created" | "failed" | "skipped";
  ttn?: string;
  trackingNumber?: string;
  uuid?: string;
  labelUrl?: string;
  errors?: string[];
  warnings?: string[];
  raw?: unknown;
  createdAt: string;
};

export type ProductOrderDetails = {
  sensorQty: number;
  firstSensorQty?: number;
  additionalSensorQty?: number;
  sensorSubtotalUah?: number;
  includeTransponder: boolean;
  transponderSubtotalUah?: number;
  hasFreeTapes: boolean;
  freeTapeQty: number;
};

export type OrderRecord = {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentStatus?: string;
  amountUah: number;
  currency: "UAH";
  customer: CustomerDetails;
  delivery: DeliveryDetails;
  productOrder?: ProductOrderDetails;
  items: OrderItem[];
  comment?: string;
  telegramPreferences?: TelegramOrderPreferences;
  paymentProvider?: PaymentProvider;
  payment?: {
    checkoutUrl?: string;
    hutkoRaw?: unknown;
    wayforpayRaw?: unknown;
    wayforpayRequest?: unknown;
    wayforpayCallbackRaw?: unknown;
    callbackRaw?: unknown;
    paidAt?: string;
  };
  shipment?: ShipmentResult;
};

export function normalizeDeliveryService(value: unknown): DeliveryService {
  const text = String(value || "").toLowerCase().trim();
  if (["ukrposhta", "ukr_poshta", "укрпочта", "укрпошта"].includes(text)) return "ukrposhta";
  return "nova_poshta";
}

export function getDeliveryServiceLabel(service: DeliveryService) {
  return service === "ukrposhta" ? "Укрпочта" : "Новая почта";
}
