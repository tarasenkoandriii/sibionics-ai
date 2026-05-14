import { MiniAppOrderOnly } from "@/components/MiniAppOrderOnly";

export const metadata = {
  title: "Замовити Sibionics GS3 — Telegram Mini App",
  description: "Форма замовлення сенсорів Sibionics GS3 з оплатою через WayForPay."
};

export default function OrderMiniAppPage() {
  const allowUkrposhta = Boolean(process.env.UKRPOSHTA_BEARER?.trim());

  return (
    <main className="miniapp-order-page">
      <section className="miniapp-order-shell">
        <div className="miniapp-order-heading">
          <span className="kicker">Telegram Mini App</span>
          <h1>Замовити Sibionics GS3</h1>
          <p className="muted">Форма замовлення сенсорів Sibionics GS3 з оплатою через WayForPay.</p>
        </div>
        <MiniAppOrderOnly allowUkrposhta={allowUkrposhta} />
      </section>
    </main>
  );
}
