"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { getDictionary, speechLocale, type Locale } from "@/lib/i18n";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export function AiVoiceDoctor({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: dict.common.medicalNotice }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const lastAssistantMessage = useMemo(() => [...messages].reverse().find((item) => item.role === "assistant"), [messages]);

  async function askDoctor(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setNotice(dict.doctor.empty);
      return;
    }

    setLoading(true);
    setNotice(null);
    setMessages((previous) => [...previous, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const response = await fetch("/api/ai/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, locale })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI doctor failed");
      setMessages((previous) => [...previous, { role: "assistant", text: data.answer }]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "AI doctor error";
      setMessages((previous) => [...previous, { role: "assistant", text }]);
    } finally {
      setLoading(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setNotice("SpeechRecognition is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = speechLocale(locale);
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setInput(transcript);
      if (transcript) askDoctor(transcript);
    };
    recognition.start();
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop?.();
    setListening(false);
  }

  async function speak(text?: string) {
    const target = text || lastAssistantMessage?.text;
    if (!target) return;

    try {
      const response = await fetch("/api/ai/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: target, locale })
      });

      if (response.ok && response.headers.get("content-type")?.includes("audio")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }
    } catch {
      // Fall back to browser speech synthesis.
    }

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(target);
      utterance.lang = speechLocale(locale);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setNotice(dict.doctor.fallback);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askDoctor(input);
  }

  return (
    <section className="dashboard-card voice-card">
      <div className="card-heading-row">
        <div>
          <span className="kicker">AI voice</span>
          <h2>{dict.doctor.title}</h2>
          <p className="muted">{dict.doctor.lead}</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => speak()}>
          {dict.doctor.speak}
        </button>
      </div>

      <div className="chat-window" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            {message.text}
          </div>
        ))}
      </div>

      <form className="voice-form" onSubmit={onSubmit}>
        <textarea
          className="input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={dict.doctor.placeholder}
          rows={3}
        />
        <div className="voice-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? dict.common.loading : dict.doctor.ask}
          </button>
          <button className="btn btn-secondary" type="button" onClick={listening ? stopVoiceInput : startVoiceInput}>
            {listening ? dict.doctor.stop : dict.doctor.record}
          </button>
        </div>
      </form>

      {notice ? <div className="alert info">{notice}</div> : null}
      <p className="disclaimer">{dict.common.medicalNotice}</p>
    </section>
  );
}
