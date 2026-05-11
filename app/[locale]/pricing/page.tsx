import { SaasHeader } from "@/components/SaasHeader";
import { SubscriptionCards } from "@/components/SubscriptionCards";
import { getDictionary, normalizeLocale, LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);

  return (
    <>
      <SaasHeader locale={locale} active="pricing" />
      <main>
        <section className="page-hero compact">
          <div className="container">
            <span className="kicker">Hutko billing</span>
            <h1>{dict.pricing.title}</h1>
            <p className="lead">{dict.pricing.lead}</p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <SubscriptionCards locale={locale} />
          </div>
        </section>
      </main>
    </>
  );
}
