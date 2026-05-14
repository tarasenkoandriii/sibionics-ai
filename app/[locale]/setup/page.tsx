import { SaasHeader } from "@/components/SaasHeader";
import { Locale, LOCALES, localePath, normalizeLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type AppBlock = {
  name: string;
  summary: string;
  points: string[];
};

type SetupContent = {
  kicker: string;
  title: string;
  lead: string;
  orderCta: string;
  dashboardCta: string;
  androidTitle: string;
  androidLead: string;
  appBlocks: AppBlock[];
  sugarConnectTitle: string;
  sugarConnectSteps: string[];
  xdripTitle: string;
  xdripSteps: string[];
  calibrationTitle: string;
  calibrationText: string;
  problemsTitle: string;
  oneAppWarning: string;
  problemItems: string[];
  jugglucoRecoveryTitle: string;
  jugglucoRecoverySteps: string[];
  wrongReadingsTitle: string;
  wrongReadingsText: string;
  installationIssueTitle: string;
  installationIssueText: string;
  noiseTitle: string;
  noiseText: string;
  conclusionTitle: string;
  conclusionItems: string[];
  finalText: string;
  notice: string;
  ctaKicker: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

const content: Record<Locale, SetupContent> = {
  ua: {
    kicker: "Sibionics GS3 · Android",
    title: "Налаштування зчитування сенсора",
    lead: "Практична інструкція для Android: Juggluco, Sugar Joy, передача даних в Xdrip, калібрування та типові проблеми зі зв'язком.",
    orderCta: "Замовити сенсор",
    dashboardCta: "Відкрити CGM дашборд",
    androidTitle: "Додатки для зчитування сенсора на Android",
    androidLead: "На телефонах Android можна зчитувати сенсор трьома різними способами: через рідний додаток, Juggluco або Sugar Joy. Нижче описані сторонні додатки та налаштування передачі даних.",
    appBlocks: [
      {
        name: "Juggluco",
        summary: "Добре тримає зв'язок із сенсором і може передавати дані в Xdrip, петлю і Nightscout.",
        points: [
          "На даний момент можуть бути проблеми з точністю показань.",
          "Сенсор працює 23 дні і 8 годин.",
          "Версії Juggluco можна завантажити з офіційного сайту розробника або з Telegram-каналу з версіями додатка.",
          "Може не працювати з європейськими сенсорами, але ця проблема може бути вирішена автором додатка."
        ]
      },
      {
        name: "Sugar Joy",
        summary: "Зазвичай трохи точніший за даними, але у багатьох користувачів виникають проблеми з втратою зв'язку.",
        points: [
          "Може передавати дані в Xdrip, а з нього — в петлю і Nightscout.",
          "Сенсор працює 23 дні і 8 годин.",
          "Може не працювати з європейськими сенсорами.",
          "Оскільки Sugar Joy не передає дані на інші пристрої і не підтримує калібрування напряму, зручніше передавати дані в Xdrip і виконувати калібрування там."
        ]
      }
    ],
    sugarConnectTitle: "Підключення сенсора до Sugar Joy",
    sugarConnectSteps: [
      "На головному екрані додатка натисніть кнопку «Підключити».",
      "Оберіть «Сканувати» та відскануйте штрих-код на внутрішній коробці сенсора.",
      "Через 10 хвилин дані почнуть надходити в додаток."
    ],
    xdripTitle: "Виведення даних з Sugar Joy в Xdrip",
    xdripSteps: [
      "В Xdrip у розділі налаштувань «Апаратне джерело даних» оберіть 640G/EverSens.",
      "Натисніть «Запуск сенсора» та оберіть «Встановлено не сьогодні».",
      "Через 10 хвилин дані почнуть надходити в Xdrip."
    ],
    calibrationTitle: "Калібрування даних в Xdrip з Sugar Joy",
    calibrationText: "Без увімкненого плагіна калібрування в Xdrip калібрування не працюватимуть. Увімкніть можливість калібрувань для даних з Sugar Joy у налаштуваннях Xdrip, а далі орієнтуйтеся на відкалібровані показання в Xdrip.",
    problemsTitle: "Проблеми та їх вирішення",
    oneAppWarning: "Для стабільної роботи сенсор повинен бути підключений тільки до одного додатка. Якщо не знаєте, як відключити його від попереднього, очистіть пам'ять попереднього додатка або видаліть його.",
    problemItems: [
      "При обриві зв'язку в Sugar Joy натисніть кнопку «Підключити» на головному екрані програми.",
      "Якщо обриви в Sugar Joy повторюються і всі налаштування перевірені, рекомендується перейти на Juggluco, де ця проблема зазвичай вирішена.",
      "При обриві зв'язку в Juggluco перевірте всі дозволи. Якщо на телефоні Android 13, встановіть галочку «Android» у меню «Датчик», перезавантажте телефон і зачекайте 20-30 хвилин."
    ],
    jugglucoRecoveryTitle: "Як відновити зв'язок у Juggluco, якщо він не відновився",
    jugglucoRecoverySteps: [
      "У меню Juggluco «Датчик» натисніть «Припинити», щоб відключити сенсор.",
      "Підключіть сенсор до Sugar Joy за інструкцією вище і зачекайте, поки завантажаться всі дані з пам'яті сенсора.",
      "Відкрийте налаштування телефону, знайдіть Sugar Joy у списку додатків і очистіть всю його пам'ять.",
      "Підключіть сенсор до Juggluco як новий і зачекайте, поки завантажаться всі дані. Якщо сенсору більше двох тижнів, це може зайняти до 10 хвилин."
    ],
    wrongReadingsTitle: "Неправильні показання в Juggluco або Sugar Joy",
    wrongReadingsText: "Калібруйте дані в Xdrip і орієнтуйтеся тільки на відкалібровані значення в Xdrip.",
    installationIssueTitle: "Неправильна установка сенсора",
    installationIssueText: "Якщо центральна частина з вусиком утоплена вниз і бовтається, сенсор не буде працювати. На переустановку є приблизно година. Сенсор можна переустановлювати і змінювати вус за аналогією з Libre 1 і 2; вуса взаємозамінні між Libre і Sibionics.",
    noiseTitle: "Сенсор «шумить»",
    noiseText: "Спробуйте промити його хлоргексидином у центральний отвір датчика звичайним шприцом без голки.",
    conclusionTitle: "Підсумок",
    conclusionItems: [
      "Juggluco добре інтегрується з іншими системами моніторингу, але може мати проблеми з точністю. Працює 23 дні і 8 годин.",
      "Sugar Joy може бути точнішим, але частіше втрачає зв'язок. Працює 23 дні і 8 годин.",
      "Рідний додаток залишається базовим варіантом, але сторонні додатки дають більше можливостей для Xdrip, петлі і Nightscout."
    ],
    finalText: "Слідуйте інструкціям з активації та налаштування, щоб отримувати максимально корисні дані про рівень глюкози.",
    notice: "Ця сторінка є технічною інструкцією і не замінює медичну консультацію. Для рішень щодо лікування звертайтеся до лікаря.",
    ctaKicker: "Наступний крок",
    ctaTitle: "Після налаштування відкрийте дашборд",
    ctaText: "У дашборді можна переглядати CGM-дані, AI-прогноз і швидкі дії для щоденного контролю.",
    ctaButton: "Відкрити дашборд"
  },
  ru: {
    kicker: "Sibionics GS3 · Android",
    title: "Настройка считывания сенсора",
    lead: "Практическая инструкция для Android: Juggluco, Sugar Joy, передача данных в Xdrip, калибровка и типичные проблемы со связью.",
    orderCta: "Заказать сенсор",
    dashboardCta: "Открыть CGM дашборд",
    androidTitle: "Приложения для считывания сенсора на Android",
    androidLead: "На телефонах Android сенсор можно считывать тремя способами: через родное приложение, Juggluco или Sugar Joy. Ниже описаны сторонние приложения и настройка передачи данных.",
    appBlocks: [
      {
        name: "Juggluco",
        summary: "Хорошо держит связь с сенсором и может передавать данные в Xdrip, петлю и Nightscout.",
        points: [
          "На данный момент могут быть проблемы с точностью показаний.",
          "Сенсор работает 23 дня и 8 часов.",
          "Версии Juggluco можно загрузить с официального сайта разработчика или из Telegram-канала с версиями приложения.",
          "Может не работать с европейскими сенсорами, но эта проблема может быть решена автором приложения."
        ]
      },
      {
        name: "Sugar Joy",
        summary: "Обычно немного точнее по данным, но у многих пользователей возникают проблемы с потерей связи.",
        points: [
          "Может передавать данные в Xdrip, а из него — в петлю и Nightscout.",
          "Сенсор работает 23 дня и 8 часов.",
          "Может не работать с европейскими сенсорами.",
          "Так как Sugar Joy не передает данные на другие устройства и не поддерживает калибровку напрямую, удобнее передавать данные в Xdrip и выполнять калибровку там."
        ]
      }
    ],
    sugarConnectTitle: "Подключение сенсора к Sugar Joy",
    sugarConnectSteps: [
      "На главном экране приложения нажмите кнопку «Подключить».",
      "Выберите «Сканировать» и отсканируйте штрих-код на внутренней коробке сенсора.",
      "Через 10 минут данные начнут поступать в приложение."
    ],
    xdripTitle: "Вывод данных из Sugar Joy в Xdrip",
    xdripSteps: [
      "В Xdrip в разделе настроек «Аппаратный источник данных» выберите 640G/EverSens.",
      "Нажмите «Запуск сенсора» и выберите «Установлено не сегодня».",
      "Через 10 минут данные начнут поступать в Xdrip."
    ],
    calibrationTitle: "Калибровка данных в Xdrip из Sugar Joy",
    calibrationText: "Без включенного плагина калибровки в Xdrip калибровки работать не будут. Включите возможность калибровок для данных из Sugar Joy в настройках Xdrip, а дальше ориентируйтесь на откалиброванные показания в Xdrip.",
    problemsTitle: "Проблемы и их решение",
    oneAppWarning: "Для стабильной работы сенсор должен быть подключен только к одному приложению. Если не знаете, как отключить его от предыдущего, очистите память предыдущего приложения или удалите его.",
    problemItems: [
      "При обрыве связи в Sugar Joy нажмите кнопку «Подключить» на главном экране программы.",
      "Если обрывы в Sugar Joy повторяются и все настройки проверены, рекомендуется перейти на Juggluco, где эта проблема обычно решена.",
      "При обрыве связи в Juggluco проверьте все разрешения. Если на телефоне Android 13, установите галочку «Android» в меню «Датчик», перезагрузите телефон и подождите 20-30 минут."
    ],
    jugglucoRecoveryTitle: "Как восстановить связь в Juggluco, если она не восстановилась",
    jugglucoRecoverySteps: [
      "В меню Juggluco «Датчик» нажмите «Прекратить», чтобы отключить сенсор.",
      "Подключите сенсор к Sugar Joy по инструкции выше и дождитесь, пока загрузятся все данные из памяти сенсора.",
      "Откройте настройки телефона, найдите Sugar Joy в списке приложений и очистите всю его память.",
      "Подключите сенсор к Juggluco как новый и дождитесь загрузки всех данных. Если сенсору больше двух недель, это может занять до 10 минут."
    ],
    wrongReadingsTitle: "Неправильные показания в Juggluco или Sugar Joy",
    wrongReadingsText: "Калибруйте данные в Xdrip и ориентируйтесь только на откалиброванные значения в Xdrip.",
    installationIssueTitle: "Неправильная установка сенсора",
    installationIssueText: "Если центральная часть с усиком утоплена вниз и болтается, сенсор не будет работать. На переустановку есть примерно час. Сенсор можно переустанавливать и менять усик по аналогии с Libre 1 и 2; усики взаимозаменяемы между Libre и Sibionics.",
    noiseTitle: "Сенсор «шумит»",
    noiseText: "Попробуйте промыть его хлоргексидином в центральное отверстие датчика обычным шприцем без иглы.",
    conclusionTitle: "Итог",
    conclusionItems: [
      "Juggluco хорошо интегрируется с другими системами мониторинга, но может иметь проблемы с точностью. Работает 23 дня и 8 часов.",
      "Sugar Joy может быть точнее, но чаще теряет связь. Работает 23 дня и 8 часов.",
      "Родное приложение остается базовым вариантом, но сторонние приложения дают больше возможностей для Xdrip, петли и Nightscout."
    ],
    finalText: "Следуйте инструкциям по активации и настройке, чтобы получать максимально полезные данные об уровне глюкозы.",
    notice: "Эта страница является технической инструкцией и не заменяет медицинскую консультацию. Для решений по лечению обращайтесь к врачу.",
    ctaKicker: "Следующий шаг",
    ctaTitle: "После настройки откройте дашборд",
    ctaText: "В дашборде можно смотреть CGM-данные, AI-прогноз и быстрые действия для ежедневного контроля.",
    ctaButton: "Открыть дашборд"
  },
  pl: {
    kicker: "Sibionics GS3 · Android",
    title: "Konfiguracja odczytu sensora",
    lead: "Praktyczna instrukcja dla Androida: Juggluco, Sugar Joy, przekazywanie danych do Xdrip, kalibracja i typowe problemy z połączeniem.",
    orderCta: "Zamów sensor",
    dashboardCta: "Otwórz dashboard CGM",
    androidTitle: "Aplikacje do odczytu sensora na Androidzie",
    androidLead: "Na telefonach z Androidem sensor można odczytywać trzema sposobami: przez aplikację natywną, Juggluco albo Sugar Joy. Poniżej opisano aplikacje zewnętrzne i konfigurację przekazywania danych.",
    appBlocks: [
      {
        name: "Juggluco",
        summary: "Dobrze utrzymuje połączenie z sensorem i może przekazywać dane do Xdrip, pętli oraz Nightscout.",
        points: [
          "Obecnie mogą występować problemy z dokładnością odczytów.",
          "Sensor działa 23 dni i 8 godzin.",
          "Wersje Juggluco można pobrać z oficjalnej strony dewelopera albo z kanału Telegram z wersjami aplikacji.",
          "Może nie działać z europejskimi sensorami, ale autor aplikacji może rozwiązać ten problem."
        ]
      },
      {
        name: "Sugar Joy",
        summary: "Zwykle jest nieco dokładniejszy, ale u wielu użytkowników pojawiają się problemy z utratą połączenia.",
        points: [
          "Może przekazywać dane do Xdrip, a dalej do pętli i Nightscout.",
          "Sensor działa 23 dni i 8 godzin.",
          "Może nie działać z europejskimi sensorami.",
          "Ponieważ Sugar Joy nie przekazuje danych na inne urządzenia i nie obsługuje kalibracji bezpośrednio, wygodniej jest przesyłać dane do Xdrip i kalibrować je tam."
        ]
      }
    ],
    sugarConnectTitle: "Podłączenie sensora do Sugar Joy",
    sugarConnectSteps: [
      "Na ekranie głównym aplikacji naciśnij przycisk «Połącz».",
      "Wybierz «Skanuj» i zeskanuj kod kreskowy z wewnętrznego pudełka sensora.",
      "Po 10 minutach dane zaczną pojawiać się w aplikacji."
    ],
    xdripTitle: "Przekazywanie danych z Sugar Joy do Xdrip",
    xdripSteps: [
      "W Xdrip w ustawieniach «Sprzętowe źródło danych» wybierz 640G/EverSens.",
      "Naciśnij «Uruchom sensor» i wybierz «Nie założono dzisiaj».",
      "Po 10 minutach dane zaczną pojawiać się w Xdrip."
    ],
    calibrationTitle: "Kalibracja danych w Xdrip z Sugar Joy",
    calibrationText: "Bez włączonej wtyczki kalibracji w Xdrip kalibracje nie będą działać. Włącz możliwość kalibracji dla danych z Sugar Joy w ustawieniach Xdrip, a następnie opieraj się na skalibrowanych wartościach w Xdrip.",
    problemsTitle: "Problemy i rozwiązania",
    oneAppWarning: "Dla stabilnej pracy sensor powinien być połączony tylko z jedną aplikacją. Jeśli nie wiesz, jak odłączyć go od poprzedniej aplikacji, wyczyść pamięć poprzedniej aplikacji albo ją usuń.",
    problemItems: [
      "Przy zerwaniu połączenia w Sugar Joy naciśnij przycisk «Połącz» na ekranie głównym aplikacji.",
      "Jeśli zerwania w Sugar Joy się powtarzają i wszystkie ustawienia zostały sprawdzone, zalecane jest przejście na Juggluco, gdzie ten problem zwykle jest rozwiązany.",
      "Przy zerwaniu połączenia w Juggluco sprawdź wszystkie uprawnienia. Jeśli telefon ma Androida 13, zaznacz «Android» w menu «Sensor», uruchom ponownie telefon i poczekaj 20-30 minut."
    ],
    jugglucoRecoveryTitle: "Jak przywrócić połączenie w Juggluco, jeśli samo nie wróciło",
    jugglucoRecoverySteps: [
      "W menu Juggluco «Sensor» naciśnij «Zatrzymaj», aby odłączyć sensor.",
      "Podłącz sensor do Sugar Joy według instrukcji powyżej i poczekaj, aż pobiorą się wszystkie dane z pamięci sensora.",
      "Otwórz ustawienia telefonu, znajdź Sugar Joy na liście aplikacji i wyczyść wszystkie dane aplikacji.",
      "Podłącz sensor do Juggluco jako nowy i poczekaj na załadowanie danych. Jeśli sensor ma ponad dwa tygodnie, może to potrwać do 10 minut."
    ],
    wrongReadingsTitle: "Nieprawidłowe wskazania w Juggluco albo Sugar Joy",
    wrongReadingsText: "Kalibruj dane w Xdrip i opieraj się tylko na skalibrowanych wartościach w Xdrip.",
    installationIssueTitle: "Nieprawidłowe założenie sensora",
    installationIssueText: "Jeśli środkowa część z włóknem jest zapadnięta i luźna, sensor nie będzie działać. Na ponowne założenie jest około godziny. Sensor można ponownie zakładać i zmieniać włókno analogicznie do Libre 1 i 2; włókna Libre i Sibionics są wzajemnie zamienne.",
    noiseTitle: "Sensor «szumi»",
    noiseText: "Spróbuj przepłukać go chlorheksydyną przez centralny otwór sensora, używając zwykłej strzykawki bez igły.",
    conclusionTitle: "Podsumowanie",
    conclusionItems: [
      "Juggluco dobrze integruje się z innymi systemami monitorowania, ale może mieć problemy z dokładnością. Działa 23 dni i 8 godzin.",
      "Sugar Joy może być dokładniejszy, ale częściej traci połączenie. Działa 23 dni i 8 godzin.",
      "Aplikacja natywna pozostaje podstawową opcją, ale aplikacje zewnętrzne dają więcej możliwości dla Xdrip, pętli i Nightscout."
    ],
    finalText: "Postępuj zgodnie z instrukcjami aktywacji i konfiguracji, aby uzyskać możliwie najbardziej użyteczne dane o poziomie glukozy.",
    notice: "Ta strona jest instrukcją techniczną i nie zastępuje konsultacji medycznej. Decyzje dotyczące leczenia konsultuj z lekarzem.",
    ctaKicker: "Następny krok",
    ctaTitle: "Po konfiguracji otwórz dashboard",
    ctaText: "W dashboardzie możesz przeglądać dane CGM, prognozę AI i szybkie działania do codziennej kontroli.",
    ctaButton: "Otwórz dashboard"
  },
  en: {
    kicker: "Sibionics GS3 · Android",
    title: "Sensor reading setup",
    lead: "A practical Android guide: Juggluco, Sugar Joy, sending data to Xdrip, calibration, and common connection issues.",
    orderCta: "Order a sensor",
    dashboardCta: "Open CGM dashboard",
    androidTitle: "Android apps for reading the sensor",
    androidLead: "On Android phones, the sensor can be read in three ways: with the native app, Juggluco, or Sugar Joy. The notes below cover third-party apps and data transfer setup.",
    appBlocks: [
      {
        name: "Juggluco",
        summary: "Keeps a good connection with the sensor and can send data to Xdrip, a loop, and Nightscout.",
        points: [
          "At the moment, there may be accuracy issues with the readings.",
          "The sensor works for 23 days and 8 hours.",
          "Juggluco versions can be downloaded from the developer's official website or from a Telegram channel with app versions.",
          "It may not work with European sensors, although the app author may resolve this issue."
        ]
      },
      {
        name: "Sugar Joy",
        summary: "Usually a little more accurate, but many users experience connection drops.",
        points: [
          "Can send data to Xdrip, and from there to a loop and Nightscout.",
          "The sensor works for 23 days and 8 hours.",
          "It may not work with European sensors.",
          "Because Sugar Joy does not send data to other devices and does not support calibration directly, it is more convenient to send data to Xdrip and calibrate it there."
        ]
      }
    ],
    sugarConnectTitle: "Connecting the sensor to Sugar Joy",
    sugarConnectSteps: [
      "On the app's main screen, tap «Connect».",
      "Choose «Scan» and scan the barcode on the inner sensor box.",
      "After 10 minutes, data will start appearing in the app."
    ],
    xdripTitle: "Sending Sugar Joy data to Xdrip",
    xdripSteps: [
      "In Xdrip settings, set the hardware data source to 640G/EverSens.",
      "Tap «Start sensor» and choose «Not installed today».",
      "After 10 minutes, data will start appearing in Xdrip."
    ],
    calibrationTitle: "Calibrating Sugar Joy data in Xdrip",
    calibrationText: "Without the calibration plugin enabled in Xdrip, calibrations will not work. Enable calibration for Sugar Joy data in Xdrip settings, then rely on the calibrated values in Xdrip.",
    problemsTitle: "Problems and fixes",
    oneAppWarning: "For stable operation, the sensor should be connected to only one app. If you do not know how to disconnect it from the previous app, clear the previous app's storage or uninstall it.",
    problemItems: [
      "If Sugar Joy loses connection, tap «Connect» on the app's main screen.",
      "If Sugar Joy keeps disconnecting and all settings have been checked, switching to Juggluco is recommended because this issue is usually resolved there.",
      "If Juggluco loses connection, check all permissions. If the phone runs Android 13, enable the «Android» checkbox in the «Sensor» menu, reboot the phone, and wait 20-30 minutes."
    ],
    jugglucoRecoveryTitle: "How to recover Juggluco connection if it does not come back",
    jugglucoRecoverySteps: [
      "In Juggluco, open the «Sensor» menu and tap «Stop» to disconnect the sensor.",
      "Connect the sensor to Sugar Joy using the instructions above and wait until all data is loaded from the sensor memory.",
      "Open phone settings, find Sugar Joy in the app list, and clear all of its storage/data.",
      "Connect the sensor to Juggluco as new and wait until all data is loaded. If the sensor is older than two weeks, this can take up to 10 minutes."
    ],
    wrongReadingsTitle: "Incorrect readings in Juggluco or Sugar Joy",
    wrongReadingsText: "Calibrate the data in Xdrip and rely only on the calibrated Xdrip values.",
    installationIssueTitle: "Incorrect sensor installation",
    installationIssueText: "If the central part with the filament is pushed down and loose, the sensor will not work. You have about one hour to reinstall it. The sensor can be reinstalled and the filament can be replaced similarly to Libre 1 and 2; Libre and Sibionics filaments are interchangeable.",
    noiseTitle: "The sensor is noisy",
    noiseText: "Try flushing the central sensor opening with chlorhexidine using a regular syringe without a needle.",
    conclusionTitle: "Summary",
    conclusionItems: [
      "Juggluco integrates well with other monitoring systems, but may have accuracy issues. It works for 23 days and 8 hours.",
      "Sugar Joy may be more accurate, but loses connection more often. It works for 23 days and 8 hours.",
      "The native app remains the basic option, but third-party apps provide more options for Xdrip, loops, and Nightscout."
    ],
    finalText: "Follow the activation and setup instructions to get the most useful glucose data possible.",
    notice: "This page is a technical guide and does not replace medical advice. Consult a clinician for treatment decisions.",
    ctaKicker: "Next step",
    ctaTitle: "Open the dashboard after setup",
    ctaText: "In the dashboard, you can view CGM data, AI prediction, and quick actions for daily control.",
    ctaButton: "Open dashboard"
  }
};

const sugarJoyScreenshots = {
  ua: [
    {
      src: "/setup/sugar-joy-main.jpg",
      alt: "Головний екран Sugar Joy з кнопкою підключення сенсора",
      caption: "На головному екрані Sugar Joy натисніть кнопку «Підключити».",
    },
    {
      src: "/setup/sugar-joy-connect.jpg",
      alt: "Екран підключення сенсора Sugar Joy з кнопкою сканування",
      caption: "Оберіть сканування QR-коду на коробці сенсора.",
    },
    {
      src: "/setup/sugar-joy-scan-qr.jpg",
      alt: "Екран камери Sugar Joy для сканування QR-коду сенсора",
      caption: "Наведіть камеру на QR-код всередині коробки сенсора.",
    },
  ],
  ru: [
    {
      src: "/setup/sugar-joy-main.jpg",
      alt: "Главный экран Sugar Joy с кнопкой подключения сенсора",
      caption: "На главном экране Sugar Joy нажмите кнопку «Подключить».",
    },
    {
      src: "/setup/sugar-joy-connect.jpg",
      alt: "Экран подключения сенсора Sugar Joy с кнопкой сканирования",
      caption: "Выберите сканирование QR-кода на коробке сенсора.",
    },
    {
      src: "/setup/sugar-joy-scan-qr.jpg",
      alt: "Экран камеры Sugar Joy для сканирования QR-кода сенсора",
      caption: "Наведите камеру на QR-код внутри коробки сенсора.",
    },
  ],
  pl: [
    {
      src: "/setup/sugar-joy-main.jpg",
      alt: "Ekran główny Sugar Joy z przyciskiem podłączenia sensora",
      caption: "Na ekranie głównym Sugar Joy naciśnij przycisk „Połącz”.",
    },
    {
      src: "/setup/sugar-joy-connect.jpg",
      alt: "Ekran podłączenia sensora Sugar Joy z przyciskiem skanowania",
      caption: "Wybierz skanowanie kodu QR z pudełka sensora.",
    },
    {
      src: "/setup/sugar-joy-scan-qr.jpg",
      alt: "Ekran aparatu Sugar Joy do skanowania kodu QR sensora",
      caption: "Skieruj aparat na kod QR wewnątrz pudełka sensora.",
    },
  ],
  en: [
    {
      src: "/setup/sugar-joy-main.jpg",
      alt: "Sugar Joy home screen with the sensor connect button",
      caption: "On the Sugar Joy home screen, tap “Connect”.",
    },
    {
      src: "/setup/sugar-joy-connect.jpg",
      alt: "Sugar Joy sensor connection screen with the scan button",
      caption: "Choose QR-code scanning on the sensor box.",
    },
    {
      src: "/setup/sugar-joy-scan-qr.jpg",
      alt: "Sugar Joy camera screen for scanning the sensor QR code",
      caption: "Point the camera at the QR code inside the sensor box.",
    },
  ],
} satisfies Record<Locale, Array<{ src: string; alt: string; caption: string }>>;

export default async function SetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = content[locale];

  return (
    <>
      <SaasHeader locale={locale} active="setup" />
      <main>
        <section className="installation-hero">
          <div className="container installation-hero-grid">
            <div>
              <span className="kicker">{t.kicker}</span>
              <h1>{t.title}</h1>
              <p className="lead">{t.lead}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={localePath(locale, "#order")}>{t.orderCta}</a>
                <a className="btn btn-secondary" href={localePath(locale, "dashboard")}>{t.dashboardCta}</a>
              </div>
            </div>
            <div className="installation-product-card">
              <div className="installation-card-note">
                <strong>Android</strong>
                <span>Juggluco · Sugar Joy · Xdrip · Nightscout</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact-section">
          <div className="container article-container">
            <article className="article-card">
              <h2>{t.androidTitle}</h2>
              <p>{t.androidLead}</p>

              <div className="feature-grid">
                {t.appBlocks.map((app) => (
                  <section className="feature-card" key={app.name}>
                    <span className="feature-dot" />
                    <h3>{app.name}</h3>
                    <p className="muted">{app.summary}</p>
                    <ul>
                      {app.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <h2>{t.sugarConnectTitle}</h2>
              <div className="setup-screenshot-gallery" aria-label={t.sugarConnectTitle}>
                {sugarJoyScreenshots[locale].map((image) => (
                  <figure className="setup-screenshot-card" key={image.src}>
                    <img src={image.src} alt={image.alt} />
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                ))}
              </div>
              <ol>
                {t.sugarConnectSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h2>{t.xdripTitle}</h2>
              <ol>
                {t.xdripSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <div className="info-panel">
                <strong>{t.calibrationTitle}</strong>
                <p>{t.calibrationText}</p>
              </div>

              <h2>{t.problemsTitle}</h2>
              <div className="warning-panel">
                <strong>GS3</strong>
                <p>{t.oneAppWarning}</p>
              </div>
              <ul>
                {t.problemItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="fixation-panel">
                <span className="kicker">Juggluco</span>
                <h2>{t.jugglucoRecoveryTitle}</h2>
                <ol>
                  {t.jugglucoRecoverySteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <h2>{t.wrongReadingsTitle}</h2>
              <p>{t.wrongReadingsText}</p>

              <h2>{t.installationIssueTitle}</h2>
              <p>{t.installationIssueText}</p>

              <h2>{t.noiseTitle}</h2>
              <p>{t.noiseText}</p>

              <h2>{t.conclusionTitle}</h2>
              <ul>
                {t.conclusionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>{t.finalText}</p>

              <div className="warning-panel">
                <strong>Medical safety</strong>
                <p>{t.notice}</p>
              </div>

              <div className="article-cta">
                <div>
                  <span className="kicker">{t.ctaKicker}</span>
                  <h2>{t.ctaTitle}</h2>
                  <p className="muted">{t.ctaText}</p>
                </div>
                <a className="btn btn-primary" href={localePath(locale, "dashboard")}>{t.ctaButton}</a>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
