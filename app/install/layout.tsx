import Script from "next/script";

export default function InstallMiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="telegram-mini-app-shell">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      {children}
    </div>
  );
}
