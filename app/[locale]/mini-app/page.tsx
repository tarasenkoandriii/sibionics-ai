import { redirect } from "next/navigation";
import { LOCALES } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function MiniAppPage() {
  redirect("/order");
}
