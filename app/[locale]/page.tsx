import { CheckoutForm } from "@/components/CheckoutForm";
import { SaasHeader } from "@/components/SaasHeader";
import { getDictionary, localePath, normalizeLocale, LOCALES } from "@/lib/i18n";
import { PRODUCT } from "@/lib/product";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);
  const allowUkrposhta = Boolean(process.env.UKRPOSHTA_BEARER?.trim());

  return (
    <>
      <SaasHeader locale={locale} active="home" />
      <main>
        <section className="saas-hero">
          <div className="container saas-hero-grid">
            <div>
              <span className="kicker">{dict.home.kicker}</span>
              <h1>{dict.home.title}</h1>
              <p className="lead">{dict.home.lead}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={localePath(locale, "dashboard")}>
                  {dict.home.primaryCta}
                </a>
                <a className="btn btn-secondary" href={localePath(locale, "onboarding")}>
                  {dict.home.secondaryCta}
                </a>
              </div>
              <div className="metric-strip">
                {dict.home.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
            </div>

            <div className="saas-device-card">
              <div className="device-card-top">
                <span>Live CGM</span>
                <strong>112 mg/dL →</strong>
              </div>
              <img src={PRODUCT.images[0].src} alt={PRODUCT.images[0].alt} />
              <div className="floating-badge saas-badge">
                <strong>Sibionics GS3</strong>
                <span>14 days · Bluetooth · AI layer</span>
              </div>
            </div>
          </div>
        </section>

        <section id="order" className="section compact-section home-order-section">
          <div className="container narrow-container">
            <div className="section-head center">
              <span className="kicker">Sibionics GS3</span>
              <h2>Замовити сенсори</h2>
              <p className="muted">Оберіть кількість сенсорів, додайте транспондер за потреби та оформіть оплату через WayForPay.</p>
            </div>
            <CheckoutForm allowUkrposhta={allowUkrposhta} />
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head center">
              <span className="kicker">SaaS stack</span>
              <h2>{dict.home.featureTitle}</h2>
              <p className="muted">{dict.home.featureLead}</p>
            </div>
            <div className="feature-grid">
              {dict.home.features.map(([title, text]) => (
                <article className="feature-card" key={title}>
                  <span className="feature-dot" />
                  <h3>{title}</h3>
                  <p className="muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section compact-section">
          <div className="container cta-panel">
            <div>
              <span className="kicker">WayForPay + Telegram + AI</span>
              <h2>Launch-ready SaaS skeleton</h2>
              <p className="muted">
                Product checkout, delivery, Telegram notifications and the older GS3 landing logic are still included. The SaaS layer adds dashboard, onboarding, voice, i18n and subscriptions.
              </p>
            </div>
            <a className="btn btn-primary" href={localePath(locale, "pricing")}>WayForPay billing</a>
          </div>
        </section>
      </main>
    </>
  );
}
