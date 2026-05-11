import { LOCALES, LOCALE_LABELS, localePath, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, suffix = "" }: { locale: Locale; suffix?: string }) {
  return (
    <div className="language-switcher" aria-label="Language selector">
      {LOCALES.map((item) => (
        <a
          key={item}
          className={item === locale ? "active" : ""}
          href={localePath(item, suffix)}
          title={LOCALE_LABELS[item]}
          aria-current={item === locale ? "page" : undefined}
        >
          {item.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
