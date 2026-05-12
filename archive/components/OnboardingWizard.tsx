"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

type ProfileDraft = {
  name: string;
  age: string;
  diabetesType: string;
  therapy: string;
  cgmDevice: string;
  lowThresholdMgDl: string;
  highThresholdMgDl: string;
  goals: string;
  telegramUsername: string;
};

const DEFAULT_DRAFT: ProfileDraft = {
  name: "",
  age: "",
  diabetesType: "type_1",
  therapy: "insulin",
  cgmDevice: "Sibionics GS3",
  lowThresholdMgDl: "70",
  highThresholdMgDl: "180",
  goals: "",
  telegramUsername: ""
};

export function OnboardingWizard({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => Math.round(((step + 1) / dict.onboarding.steps.length) * 100), [step, dict.onboarding.steps.length]);

  useEffect(() => {
    const stored = window.localStorage.getItem("glucomind_onboarding_draft");
    if (stored) {
      try {
        setDraft({ ...DEFAULT_DRAFT, ...JSON.parse(stored) });
      } catch {
        // Ignore corrupted local drafts.
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("glucomind_onboarding_draft", JSON.stringify(draft));
  }, [draft]);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, locale })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Onboarding failed");
      setSavedProfileId(data.profile.profileId);
      window.localStorage.setItem("glucomind_profile_id", data.profile.profileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="onboarding-wizard" onSubmit={submit}>
      <div className="wizard-progress" aria-label="Onboarding progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="wizard-steps">
        {dict.onboarding.steps.map((label, index) => (
          <button
            key={label}
            className={index === step ? "active" : ""}
            type="button"
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div className="form-grid two">
          <label>
            {dict.onboarding.fields.name}
            <input className="input" value={draft.name} onChange={(event) => update("name", event.target.value)} required />
          </label>
          <label>
            {dict.onboarding.fields.age}
            <input className="input" type="number" min="1" max="120" value={draft.age} onChange={(event) => update("age", event.target.value)} />
          </label>
          <label>
            {dict.onboarding.fields.telegram}
            <input className="input" value={draft.telegramUsername} onChange={(event) => update("telegramUsername", event.target.value)} placeholder="@username" />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="form-grid two">
          <label>
            {dict.onboarding.fields.diabetesType}
            <select className="input" value={draft.diabetesType} onChange={(event) => update("diabetesType", event.target.value)}>
              <option value="type_1">Type 1</option>
              <option value="type_2">Type 2</option>
              <option value="gestational">Gestational</option>
              <option value="other">Other / not specified</option>
            </select>
          </label>
          <label>
            {dict.onboarding.fields.therapy}
            <select className="input" value={draft.therapy} onChange={(event) => update("therapy", event.target.value)}>
              <option value="insulin">Insulin</option>
              <option value="tablets">Tablets</option>
              <option value="diet">Diet / lifestyle</option>
              <option value="mixed">Mixed therapy</option>
            </select>
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="form-grid three">
          <label>
            {dict.onboarding.fields.device}
            <input className="input" value={draft.cgmDevice} onChange={(event) => update("cgmDevice", event.target.value)} />
          </label>
          <label>
            {dict.onboarding.fields.low}
            <input className="input" type="number" value={draft.lowThresholdMgDl} onChange={(event) => update("lowThresholdMgDl", event.target.value)} />
          </label>
          <label>
            {dict.onboarding.fields.high}
            <input className="input" type="number" value={draft.highThresholdMgDl} onChange={(event) => update("highThresholdMgDl", event.target.value)} />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <label>
          {dict.onboarding.fields.goals}
          <textarea className="input" rows={5} value={draft.goals} onChange={(event) => update("goals", event.target.value)} />
        </label>
      ) : null}

      {error ? <div className="alert error">{error}</div> : null}
      {savedProfileId ? (
        <div className="alert success">
          {dict.onboarding.saved} <code>{savedProfileId}</code> · <a href={localePath(locale, "dashboard")}>{dict.common.dashboard}</a>
        </div>
      ) : null}

      <div className="wizard-actions">
        <button className="btn btn-secondary" type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
          {dict.common.back}
        </button>
        {step < dict.onboarding.steps.length - 1 ? (
          <button className="btn btn-primary" type="button" onClick={() => setStep((value) => Math.min(dict.onboarding.steps.length - 1, value + 1))}>
            {dict.common.continue}
          </button>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? dict.common.loading : dict.onboarding.submit}
          </button>
        )}
      </div>
    </form>
  );
}
