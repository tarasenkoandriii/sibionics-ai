import { OnboardingWizard } from "@/components/OnboardingWizard";
import { SaasHeader } from "@/components/SaasHeader";
import { getDictionary, normalizeLocale, LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);

  return (
    <>
      <SaasHeader locale={locale} active="onboarding" />
      <main>
        <section className="page-hero compact">
          <div className="container">
            <span className="kicker">wizard</span>
            <h1>{dict.onboarding.title}</h1>
            <p className="lead">{dict.onboarding.lead}</p>
          </div>
        </section>
        <section className="section">
          <div className="container narrow-container">
            <OnboardingWizard locale={locale} />
          </div>
        </section>
      </main>
    </>
  );
}
