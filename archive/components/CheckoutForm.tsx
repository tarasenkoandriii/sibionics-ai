"use client";

import { FormEvent, useMemo, useState } from "react";
import { calculateProductOrder, moneyUah, normalizeSensorQty, ORDER_PRICING, sensorPricingLabel } from "@/lib/order-config";

type DeliveryOption = "nova_poshta" | "ukrposhta";

type CheckoutState = {
  name: string;
  phone: string;
  email: string;
  delivery: DeliveryOption;
  city: string;
  branch: string;
  postalCode: string;
  addressLine: string;
  comment: string;
};

const initialState: CheckoutState = {
  name: "",
  phone: "",
  email: "",
  delivery: "nova_poshta",
  city: "",
  branch: "",
  postalCode: "",
  addressLine: "",
  comment: ""
};

export function CheckoutForm() {
  const [sensorQty, setSensorQty] = useState(1);
  const [includeTransponder, setIncludeTransponder] = useState(true);
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderSummary = useMemo(
    () => calculateProductOrder({ sensorQty, includeTransponder }),
    [sensorQty, includeTransponder]
  );

  const isUkrposhta = form.delivery === "ukrposhta";

  function updateField<K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSensorQty(value: unknown) {
    setSensorQty(normalizeSensorQty(value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/payments/wayforpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sensorQty: orderSummary.sensorQty,
          includeTransponder: orderSummary.includeTransponder
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось создать оплату WayForPay.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка оформления заказа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="order-panel" onSubmit={submit} id="checkout">
      <div className="section-head" style={{ marginBottom: 22 }}>
        <span className="kicker">Оплата по умолчанию WayForPay</span>
        <h2>Оформить заказ Sibionics GS3</h2>
        <p className="muted">
          Выберите количество сенсоров, добавьте транспондер только при необходимости. Первый сенсор считается по базовой цене,
          второй и последующие — по сниженной цене. При заказе от двух сенсоров тейпы автоматически добавляются в подарок.
        </p>
      </div>

      <div className="steps" style={{ marginBottom: 18 }}>
        <div className="qty-row product-qty-row">
          <div>
            <strong>Сенсоры Sibionics GS3</strong>
            <br />
            <span>
              {sensorPricingLabel()}; минимум {ORDER_PRICING.sensor.minQuantity} шт.
            </span>
          </div>
          <button
            className="qty-control"
            type="button"
            onClick={() => updateSensorQty(sensorQty - 1)}
            aria-label="Уменьшить количество сенсоров"
          >
            −
          </button>
          <input
            className="qty-input"
            type="number"
            min={ORDER_PRICING.sensor.minQuantity}
            max={ORDER_PRICING.sensor.maxQuantity}
            value={sensorQty}
            onChange={(event) => updateSensorQty(event.target.value)}
            aria-label="Количество сенсоров"
          />
          <button
            className="qty-control"
            type="button"
            onClick={() => updateSensorQty(sensorQty + 1)}
            aria-label="Увеличить количество сенсоров"
          >
            +
          </button>
        </div>

        <label className="option-row">
          <input
            type="checkbox"
            checked={includeTransponder}
            onChange={(event) => setIncludeTransponder(event.target.checked)}
          />
          <span>
            <strong>Добавить транспондер</strong>
            <small>
              +{moneyUah(ORDER_PRICING.transponder.unitPriceUah)}. Оставьте выключенным, если транспондер уже есть.
            </small>
          </span>
        </label>

        <div className={`gift-note ${orderSummary.hasFreeTapes ? "active" : ""}`}>
          {orderSummary.hasFreeTapes ? (
            <>
              🎁 Акция активна: тейпы в подарок — {orderSummary.freeTapeQty} шт.
            </>
          ) : (
            <>
              Добавьте еще {ORDER_PRICING.tapeGift.minSensorQuantity - orderSummary.sensorQty} сенсор, чтобы получить тейпы в подарок.
            </>
          )}
        </div>

        <div className="order-lines" aria-label="Состав заказа">
          {orderSummary.items.map((item) => (
            <div className="order-line" key={item.sku}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <strong>{item.lineTotalUah > 0 ? moneyUah(item.lineTotalUah) : "подарок"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Имя и фамилия</span>
          <input
            className="input"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Например, Александр Иванов"
            required
          />
        </label>

        <label className="field">
          <span>Телефон</span>
          <input
            className="input"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+380..."
            required
          />
        </label>

        <label className="field full">
          <span>Email для квитанции</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="name@example.com"
          />
        </label>

        <label className="field">
          <span>Доставка</span>
          <select
            className="select"
            value={form.delivery}
            onChange={(event) => updateField("delivery", event.target.value as DeliveryOption)}
          >
            <option value="nova_poshta">Новая почта</option>
            <option value="ukrposhta">Укрпочта</option>
          </select>
        </label>

        <label className="field">
          <span>Город</span>
          <input
            className="input"
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="Киев"
            required
          />
        </label>

        <label className="field full">
          <span>{isUkrposhta ? "Отделение / адрес Укрпочты" : "Отделение / почтомат Новой почты"}</span>
          <input
            className="input"
            value={form.branch}
            onChange={(event) => updateField("branch", event.target.value)}
            placeholder={isUkrposhta ? "Например, отделение 01001 или адрес" : "Например, отделение №1 / почтомат"}
            required
          />
        </label>

        {isUkrposhta ? (
          <>
            <label className="field">
              <span>Индекс Укрпочты</span>
              <input
                className="input"
                inputMode="numeric"
                pattern="\d{5}"
                value={form.postalCode}
                onChange={(event) => updateField("postalCode", event.target.value)}
                placeholder="01001"
                required
              />
            </label>

            <label className="field">
              <span>Улица и дом</span>
              <input
                className="input"
                value={form.addressLine}
                onChange={(event) => updateField("addressLine", event.target.value)}
                placeholder="Хрещатик 22 или отделение"
              />
            </label>
          </>
        ) : null}

        <label className="field full">
          <span>Комментарий</span>
          <textarea
            className="textarea"
            value={form.comment}
            onChange={(event) => updateField("comment", event.target.value)}
            placeholder="Удобное время связи, пожелания к отправке"
          />
        </label>
      </div>

      <div className="total-box">
        <div>
          <small>Итого к оплате через WayForPay</small>
          <br />
          <strong>{moneyUah(orderSummary.totalUah)}</strong>
        </div>
        <div className="price-note">{orderSummary.currency}</div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Создаем платеж…" : "Оплатить через WayForPay"}
      </button>

      <p className="disclaimer" style={{ marginTop: 14 }}>
        Стоимость берется из конфигурации проекта. Заказ сохраняется перед оплатой, бот уведомляет менеджера, а после
        callback WayForPay можно автоматически сформировать ТТН через API выбранной службы доставки. Код Hutko/PUMB оставлен в проекте как legacy/fallback.
      </p>
    </form>
  );
}
