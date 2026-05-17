Files-only ZIP for payment Telegram Mini App update.

Copy these files into the project root.

Changes:
- /payment route keeps title "Оплата підписки".
- Payment block title is rendered as: "Дані для платежу для {username} id#{telegram_id}".
- username and telegram_id are read from Telegram.WebApp.initDataUnsafe.user.
- Added fallback parsing from Telegram.WebApp.initData when initDataUnsafe is not ready.
- Added short retry loop after Telegram.WebApp.ready() so data appears after the Telegram SDK finishes initializing.
