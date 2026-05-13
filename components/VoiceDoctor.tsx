"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { normalizeLocale, speechLocale, type Locale } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function getCurrentLocale(): Locale {
  if (typeof window === "undefined") return "ua";
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  return normalizeLocale(firstSegment);
}

export default function VoiceDoctor() {
  const [hiddenOnMiniApp, setHiddenOnMiniApp] = useState(false);

  useEffect(() => {
    setHiddenOnMiniApp(window.location.pathname.includes("/mini-app"));
  }, []);

  const [locale, setLocale] = useState<Locale>("ua");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Вітаю 👋 Я AI Doctor. Можу допомогти з питаннями про CGM, глюкозу, харчування та контроль цукру."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [open, setOpen] = useState(true);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocale(getCurrentLocale());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale(locale);
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  const askDoctor = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: trimmed
      }
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/voice-doctor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmed,
          history: updatedMessages,
          locale
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI voice doctor request failed");
      }

      const aiMessage: Message = {
        role: "assistant",
        content: data.text || data.answer || "AI не повернув текст відповіді."
      };

      setMessages((prev) => [...prev, aiMessage]);
      speak(aiMessage.content);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Сталася помилка при з’єднанні з AI. Спробуйте ще раз."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition не підтримується у вашому браузері.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = speechLocale(locale);
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setRecording(true);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      askDoctor(transcript);
    };

    recognition.onerror = (error: any) => {
      console.error(error);
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      askDoctor(input);
    }
  };

  if (!open) {
    if (hiddenOnMiniApp) return null;

  return (
      <button className="voice-doctor-launch" type="button" onClick={() => setOpen(true)} aria-label="Open AI Doctor">
        🎤 AI Doctor
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white p-4 shadow-xl rounded-xl w-80 voice-doctor-floating">
      <div className="voice-doctor-header">
        <div>
          <h2>🎤 AI Doctor</h2>
          <p>CGM Assistant Online</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close AI Doctor">
          ×
        </button>
      </div>

      <div className="voice-doctor-chat" aria-live="polite">
        {messages.map((msg, index) => (
          <div key={`${msg.role}-${index}`} className={`voice-doctor-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {loading ? <div className="voice-doctor-message assistant muted">AI друкує...</div> : null}
        <div ref={messagesEndRef} />
      </div>

      <div className="voice-doctor-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Запитайте AI лікаря..."
          aria-label="Запитайте AI лікаря"
        />

        <button type="button" onClick={() => askDoctor(input)} disabled={loading} aria-label="Send message">
          ➤
        </button>

        <button
          type="button"
          onClick={startVoiceInput}
          className={recording ? "recording" : ""}
          aria-label="Start voice input"
        >
          🎙
        </button>
      </div>

      <p className="voice-doctor-disclaimer">AI не ставить медичні діагнози</p>
    </div>
  );
}
