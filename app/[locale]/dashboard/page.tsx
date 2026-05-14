import { AiAnalyzer } from "@/components/AiAnalyzer";
import { AiVoiceDoctor } from "@/components/AiVoiceDoctor";
import { CgmRealtime } from "@/components/CgmRealtime";
import { DashboardActions } from "@/components/DashboardActions";
import { SaasHeader } from "@/components/SaasHeader";
import { getDictionary, localePath, normalizeLocale, LOCALES, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const dashboardPageCopy: Record<Locale, {
  authNote: string;
  telegramLogin: string;
  developmentTitle: string;
  developmentText: string;
  photoKicker: string;
  photoTitle: string;
  photoLead: string;
}> = {
  ua: {
    authNote:
      "Telegram login є опціональним. Без входу цей дашборд працює в demo/guest режимі; login потрібен тільки для збереження SaaS-профілю та Mini App-сесії.",
    telegramLogin: "Login Telegram опціонально",
    developmentTitle: "Сторінка знаходиться в розробці",
    developmentText: "Дашборд почне працювати найближчим часом. Зараз частина блоків показана як demo/mock-інтерфейс для попереднього перегляду.",
    photoKicker: "AI фото",
    photoTitle: "Аналіз фото",
    photoLead:
      "Нижче доступний 4-режимний аналіз зображень: графік глюкози, сенсор/тейп, прогноз їжі та аналізи."
  },
  ru: {
    authNote:
      "Telegram login опционален. Без входа этот дашборд работает в demo/guest режиме; login нужен только для сохранения SaaS-профиля и Mini App-сессии.",
    telegramLogin: "Login Telegram опционально",
    developmentTitle: "Страница находится в разработке",
    developmentText: "Дашборд начнет работать в ближайшее время. Сейчас часть блоков показана как demo/mock-интерфейс для предварительного просмотра.",
    photoKicker: "AI фото",
    photoTitle: "Анализ фото",
    photoLead:
      "Ниже доступен 4-режимный анализ изображений: график глюкозы, сенсор/тейп, прогноз еды и анализы."
  },
  pl: {
    authNote:
      "Logowanie przez Telegram jest opcjonalne. Bez logowania panel działa w trybie demo/guest; logowanie zapisuje tylko profil SaaS i sesję Mini App.",
    telegramLogin: "Login Telegram opcjonalny",
    developmentTitle: "Strona jest w trakcie tworzenia",
    developmentText: "Panel zacznie działać w najbliższym czasie. Obecnie część bloków jest pokazana jako interfejs demo/mock do podglądu.",
    photoKicker: "AI foto",
    photoTitle: "Analiza zdjęć",
    photoLead:
      "Poniżej dostępna jest analiza obrazów w 4 trybach: wykres glukozy, sensor/plaster, prognoza posiłku i wyniki badań."
  },
  en: {
    authNote:
      "Telegram login is optional. Without login this dashboard works in demo/guest mode; login only saves the SaaS profile and Mini App session.",
    telegramLogin: "Login Telegram optional",
    developmentTitle: "This page is under development",
    developmentText: "The dashboard will start working soon. For now, some blocks are shown as a demo/mock interface for preview.",
    photoKicker: "AI photo",
    photoTitle: "Photo analysis",
    photoLead:
      "The original 4-mode image analysis remains available below: glucose graph, sensor/tape, food forecast, and labs."
  }
};

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const dict = getDictionary(locale);
  const pageCopy = dashboardPageCopy[locale];

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
              <p className="optional-auth-note">{pageCopy.authNote}</p>
              <div className="dashboard-development-notice" role="status">
                <strong>{pageCopy.developmentTitle}</strong>
                <span>{pageCopy.developmentText}</span>
              </div>
            </div>
            <div className="hero-actions vertical-actions">
              <a className="btn btn-secondary" href={localePath(locale, "pricing")}>{dict.common.pricing}</a>
              <a className="btn btn-ghost" href={`/api/auth/telegram/oidc/start?locale=${locale}`}>{pageCopy.telegramLogin}</a>
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
                <span className="kicker">{pageCopy.photoKicker}</span>
                <h2>{pageCopy.photoTitle}</h2>
                <p className="muted">{pageCopy.photoLead}</p>
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
