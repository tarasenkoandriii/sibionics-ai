import { SaasHeader } from "@/components/SaasHeader";
import { InstallationContent } from "@/components/pages/InstallationContent";
import { LOCALES, normalizeLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function InstallationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  return (
    <>
      <SaasHeader locale={locale} active="installation" />
      <InstallationContent locale={locale} />
    </>
  );
}
