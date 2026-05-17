import PaymentTelegramApp from "./PaymentTelegramApp";

export const metadata = {
  title: "GlucoMind Payment — Telegram Mini App",
  description: "Telegram Mini App for WayForPay subscription checkout."
};

export default function PaymentPage() {
  return <PaymentTelegramApp />;
}
