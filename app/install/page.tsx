import InstallTelegramApp from "./InstallTelegramApp";
import SensorInstallPhotoCheck from "./SensorInstallPhotoCheck";
import { InstallationContent } from "@/components/pages/InstallationContent";

export const metadata = {
  title: "Sibionics GS3 Installation — Telegram Mini App",
  description: "Mobile-first Telegram Mini App guide for Sibionics GS3 sensor installation."
};

export default function InstallPage() {
  return (
    <>
      <InstallTelegramApp />
      <InstallationContent locale="ua" miniApp />
      <SensorInstallPhotoCheck />
    </>
  );
}
