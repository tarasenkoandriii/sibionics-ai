import { AiAnalyzer } from "@/components/AiAnalyzer";
import { AiVoiceDoctor } from "@/components/AiVoiceDoctor";
import { CgmRealtime } from "@/components/CgmRealtime";
import { DashboardActions } from "@/components/DashboardActions";
import { SaasHeader } from "@/components/SaasHeader";
import { getDictionary, localePath, normalizeLocale, LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);

  return (
    <>
      <SaasHeader locale={locale} active="dashboard" />
      <main className="dashboard-page">
        <section className="page-hero compact">
          <div className="container page-hero-inner">
            <div>
              <span className="kicker">CGM SaaS</span>
              <h1>{dict.dashboard.title}</h1>
              <p className="lead">{dict.dashboard.lead}</p>
              <p className="optional-auth-note">Telegram login is optional. Without login this dashboard works in demo/guest mode; login only saves the SaaS profile and Mini App session.</p>
            </div>
            <div className="hero-actions vertical-actions">
              <a className="btn btn-secondary" href={localePath(locale, "pricing")}>{dict.common.pricing}</a>
              <a className="btn btn-ghost" href={`/api/auth/telegram/oidc/start?locale=${locale}`}>Login Telegram optional</a>
            </div>
          </div>
        </section>

        <section className="section dashboard-grid-section">
          <div className="container dashboard-grid">
            <div className="dashboard-main-column">
              <CgmRealtime locale={locale} />
              <AiVoiceDoctor locale={locale} />
            </div>
            <aside className="dashboard-side-column">
              <DashboardActions locale={locale} />
              <section className="dashboard-card stack-card">
                <span className="kicker">AI photo</span>
                <h2>Photo analysis</h2>
                <p className="muted">
                  The original 4-mode image analysis remains available below: glucose graph, sensor/tape, food forecast, and labs.
                </p>
              </section>
            </aside>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <AiAnalyzer locale={locale} />
          </div>
        </section>
      </main>
    </>
  );
}
