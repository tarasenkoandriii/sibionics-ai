import { getDictionary, type Locale } from "@/lib/i18n";

export function DashboardActions({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section className="dashboard-card quick-actions-card">
      <span className="kicker">workflow</span>
      <h2>{dict.dashboard.quickActions}</h2>
      <div className="quick-actions-grid">
        {dict.dashboard.actions.map((action) => (
          <button className="quick-action" key={action} type="button">
            <span>＋</span>
            {action}
          </button>
        ))}
      </div>
      <p className="muted">
        These actions are wired as UI stubs so the project can later connect real meal logs, insulin logs, PDF exports, and clinician sharing.
      </p>
    </section>
  );
}
