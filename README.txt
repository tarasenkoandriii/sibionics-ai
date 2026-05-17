Files for copying into the project root.

Changes included:
- Pricing plan names changed:
  - Starter -> Freemium
  - Pro -> Premium
- Added Telegram Mini App payment route: /payment
- /payment initializes Telegram.WebApp, reads Telegram user data, and passes username/id to the payment UI.
- The title "Дані для платежу" becomes "Дані для платежу для {username} id#{telegram_id}" when Telegram user data is available.
- Paid subscription checkout in Telegram Mini App opens payment checkout with Telegram.WebApp.openLink(paymentUrl).
- VoiceDoctor is hidden on /payment.

Copy these files into the root of the project, preserving paths.
