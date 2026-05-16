import InsulinMiniApp from "./InsulinMiniApp";
import InsulinTelegramApp from "./InsulinTelegramApp";

export const metadata = {
  title: "GlucoMind Insulin — Telegram Mini App",
  description: "Telegram Mini App for Grok AI insulin photo recognition and editable insulin notes."
};

export default function InsulinPage() {
  return (
    <>
      <InsulinTelegramApp />
      <InsulinMiniApp />
    </>
  );
}
