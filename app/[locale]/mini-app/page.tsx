import { MiniAppOrderOnly } from "@/components/MiniAppOrderOnly";
import { normalizeLocale, LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function MiniAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
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
