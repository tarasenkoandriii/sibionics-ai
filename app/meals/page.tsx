import MealsMiniApp from "./MealsMiniApp";
import MealsTelegramApp from "./MealsTelegramApp";

export const metadata = {
  title: "GlucoMind Meals — Telegram Mini App",
  description: "Telegram Mini App for Grok AI meal photo recognition and editable nutrition estimates."
};

export default function MealsPage() {
  return (
    <>
      <MealsTelegramApp />
      <MealsMiniApp />
    </>
  );
}
