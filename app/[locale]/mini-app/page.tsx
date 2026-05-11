import { MiniAppLogin } from "@/components/MiniAppLogin";
import { SaasHeader } from "@/components/SaasHeader";
import { getDictionary, normalizeLocale, LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function MiniAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);

  return (
    <>
      <SaasHeader locale={locale} active="mini-app" />
      <main>
        <section className="page-hero compact">
          <div className="container">
            <span className="kicker">Telegram Mini App</span>
            <h1>{dict.miniApp.title}</h1>
            <p className="lead">{dict.miniApp.lead}</p>
          </div>
        </section>
        <section className="section">
          <div className="container narrow-container">
            <MiniAppLogin locale={locale} />
          </div>
        </section>
      </main>
    </>
  );
}
