import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthButtons } from "@/components/AuthButtons";

type ActivePage = "home" | "dashboard" | "onboarding" | "pricing" | "mini-app";

function navClass(active: ActivePage, page: ActivePage) {
  return active === page ? "active" : undefined;
}

export function SaasHeader({ locale, active }: { locale: Locale; active: ActivePage }) {
  const dict = getDictionary(locale);
  const suffix = active === "home" ? "" : active;

  return (
    <header className="saas-header">
      <div className="container saas-header-inner">
        <a className="saas-logo" href={localePath(locale)} aria-label={dict.common.appName}>
          <span className="saas-logo-mark">GM</span>
          <span>
            <strong>{dict.common.appName}</strong>
            <small>{dict.common.tagline}</small>
          </span>
        </a>

        <nav className="saas-nav" aria-label="SaaS navigation">
          <a className={navClass(active, "home")} href={localePath(locale)}>
            {dict.nav.home}
          </a>
          <a className={navClass(active, "dashboard")} href={localePath(locale, "dashboard")}>
            {dict.nav.dashboard}
          </a>
          <a className={navClass(active, "onboarding")} href={localePath(locale, "onboarding")}>
            {dict.nav.onboarding}
          </a>
          <a className={navClass(active, "pricing")} href={localePath(locale, "pricing")}>
            {dict.nav.pricing}
          </a>
          <a className={navClass(active, "mini-app")} href={localePath(locale, "mini-app")}>
            {dict.nav.miniApp}
          </a>
        </nav>

        <div className="saas-header-actions">
          <AuthButtons locale={locale} />
          <LanguageSwitcher locale={locale} suffix={suffix} />
          <a className="btn btn-primary" href={localePath(locale, "pricing")}>
            {dict.common.start}
          </a>
        </div>
      </div>
    </header>
  );
}
