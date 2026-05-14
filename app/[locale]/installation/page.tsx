import { SaasHeader } from "@/components/SaasHeader";
import { Locale, LOCALES, localePath, normalizeLocale } from "@/lib/i18n";
import { PRODUCT } from "@/lib/product";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type InstallationContent = {
  kicker: string;
  title: string;
  lead: string;
  orderCta: string;
  dashboardCta: string;
  productNote: string;
  intro: string[];
  typesTitle: string;
  typesParagraphs: string[];
  infoTitle: string;
  infoText: string;
  chinaOnly: string;
  warningTitle: string;
  warningText: string;
  placementTitle: string;
  placementIntro: string;
  placementZones: string[];
  captions: string[];
  fixationTitle: string;
  fixationLead: string;
  fixationItems: string[];
  sensorInstallTitle: string;
  sensorInstallText: string;
  ctaKicker: string;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  imageAlts: string[];
};

const content: Record<Locale, InstallationContent> = {
  ua: {
    kicker: "Sibionics GS3 · установка",
    title: "Установка сенсора Sibionics GS3",
    lead:
      "Короткий практичний гайд: типи сенсорів, різниця між офіційним і сторонніми додатками, зони встановлення та фіксація пластиром.",
    orderCta: "Замовити сенсор",
    dashboardCta: "Відкрити CGM дашборд",
    productNote: "CGM сенсор · Android · сторонні додатки",
    intro: [
      "Китайські сенсори Sibionics тільки нещодавно з'явилися на ринку, але досить швидко набирають популярність. В першу чергу, завдяки тому, що їх виробники досить точно повторюють конструкцію вусиків Freestyle Libre 1 і 2. Крім того, на Android сторонні додатки можуть зчитувати дані з цих сенсорів до 24 днів.",
      "Давайте розберемося, чи дійсно все так просто і зручно."
    ],
    typesTitle: "Типи сенсорів Sibionics",
    typesParagraphs: [
      "За наявною інформацією, сенсори Sibionics бувають китайські та європейські.",
      "У європейських сенсорів інша система, і сторонні додатки поки не можуть зчитувати їх дані, тому вони працюють тільки 14 днів."
    ],
    infoTitle: "Важлива різниця",
    infoText:
      "Офіційний додаток зчитує будь-які сенсори тільки 14 днів, а сторонні додатки, наприклад Juggluco або SugarJoy, можуть працювати до 24 днів.",
    chinaOnly: "Тільки китайські сенсори можуть працювати 24 дні з Android і сторонніми додатками.",
    warningTitle: "Пам'ятайте",
    warningText:
      "Сенсор може працювати до 24 днів, але це не гарантує його стабільну роботу протягом всього цього часу. Часто після 10-12 днів показання можуть стати неточними, незважаючи на те, що сенсор фізично працює і передає дані.",
    placementTitle: "Установка і фіксація сенсора",
    placementIntro:
      "Встановлюємо сенсор як і всі інші системи моніторингу рівня цукру в крові — в області з достатньою кількістю жирової тканини:",
    placementZones: ["Плечі", "Живіт", "Стегно", "Верх сідниць"],
    captions: [
      "Рекомендовані зони встановлення: плечі, живіт, стегна та верх сідниць.",
      "Приклад фіксації сенсора Sibionics штатним додатковим пластиром.",
      "Додаткова прозора фіксація допомагає зменшити ризик відклеювання під час носіння."
    ],
    fixationTitle: "Рекомендації по фіксації",
    fixationLead: "Щоб сенсор тримався стабільніше протягом усього періоду носіння, дотримуйтесь базових правил підготовки шкіри та фіксації.",
    fixationItems: [
      "Встановлюйте сенсор на чисту, суху та знежирену шкіру.",
      "Не ставте сенсор на ділянки з подразненням, рубцями або сильним тертям одягу.",
      "Після установки притисніть пластир по периметру, не тиснучи на сам сенсор.",
      "Для спорту, душу або активного дня можна додатково зафіксувати сенсор прозорою плівкою або тейпом.",
      "Стежте, щоб край пластиру не відклеювався; при потребі підклейте його додатковим тейпом."
    ],
    sensorInstallTitle: "Установка сенсора",
    sensorInstallText:
      "Для фіксації в комплекті з датчиком приходить додатковий пластир, який тримається весь термін роботи сенсора. Важливо стежити, щоб площадка з вусиком була рівно встановлена в пристрілювач.",
    ctaKicker: "Замовлення GS3",
    ctaTitle: "Потрібен сенсор або транспондер?",
    ctaText: "На головній сторінці можна обрати кількість сенсорів, додати транспондер та оплатити через WayForPay.",
    ctaButton: "Перейти до форми",
    imageAlts: [
      "Схема зон встановлення сенсора: плечі, живіт, стегно та верх сідниць",
      "Приклад фіксації сенсора Sibionics пластиром на шкірі",
      "Приклад сенсора Sibionics із додатковою прозорою фіксацією на шкірі"
    ]
  },
  ru: {
    kicker: "Sibionics GS3 · установка",
    title: "Установка сенсора Sibionics GS3",
    lead:
      "Краткий практический гид: типы сенсоров, разница между официальным и сторонними приложениями, зоны установки и фиксация пластырем.",
    orderCta: "Заказать сенсор",
    dashboardCta: "Открыть CGM дашборд",
    productNote: "CGM сенсор · Android · сторонние приложения",
    intro: [
      "Китайские сенсоры Sibionics появились на рынке сравнительно недавно, но довольно быстро набирают популярность. В первую очередь благодаря тому, что производители достаточно точно повторяют конструкцию усиков Freestyle Libre 1 и 2. Кроме того, на Android сторонние приложения могут считывать данные с этих сенсоров до 24 дней.",
      "Давайте разберемся, действительно ли все так просто и удобно."
    ],
    typesTitle: "Типы сенсоров Sibionics",
    typesParagraphs: [
      "По имеющейся информации, сенсоры Sibionics бывают китайские и европейские.",
      "У европейских сенсоров другая система, и сторонние приложения пока не могут считывать их данные, поэтому они работают только 14 дней."
    ],
    infoTitle: "Важная разница",
    infoText:
      "Официальное приложение считывает любые сенсоры только 14 дней, а сторонние приложения, например Juggluco или SugarJoy, могут работать до 24 дней.",
    chinaOnly: "Только китайские сенсоры могут работать 24 дня с Android и сторонними приложениями.",
    warningTitle: "Помните",
    warningText:
      "Сенсор может работать до 24 дней, но это не гарантирует его стабильную работу в течение всего этого времени. Часто после 10-12 дней показания могут стать неточными, несмотря на то, что сенсор физически работает и передает данные.",
    placementTitle: "Установка и фиксация сенсора",
    placementIntro:
      "Устанавливаем сенсор, как и другие системы мониторинга уровня сахара в крови — в области с достаточным количеством жировой ткани:",
    placementZones: ["Плечи", "Живот", "Бедро", "Верх ягодиц"],
    captions: [
      "Рекомендованные зоны установки: плечи, живот, бедра и верх ягодиц.",
      "Пример фиксации сенсора Sibionics штатным дополнительным пластырем.",
      "Дополнительная прозрачная фиксация помогает снизить риск отклеивания во время ношения."
    ],
    fixationTitle: "Рекомендации по фиксации",
    fixationLead: "Чтобы сенсор держался стабильнее весь период ношения, соблюдайте базовые правила подготовки кожи и фиксации.",
    fixationItems: [
      "Устанавливайте сенсор на чистую, сухую и обезжиренную кожу.",
      "Не ставьте сенсор на участки с раздражением, рубцами или сильным трением одежды.",
      "После установки прижмите пластырь по периметру, не надавливая на сам сенсор.",
      "Для спорта, душа или активного дня можно дополнительно зафиксировать сенсор прозрачной пленкой или тейпом.",
      "Следите, чтобы край пластыря не отклеивался; при необходимости подклейте его дополнительным тейпом."
    ],
    sensorInstallTitle: "Установка сенсора",
    sensorInstallText:
      "Для фиксации в комплекте с датчиком идет дополнительный пластырь, который держится весь срок работы сенсора. Важно следить, чтобы площадка с усиком была ровно установлена в пристреливатель.",
    ctaKicker: "Заказ GS3",
    ctaTitle: "Нужен сенсор или транспондер?",
    ctaText: "На главной странице можно выбрать количество сенсоров, добавить транспондер и оплатить через WayForPay.",
    ctaButton: "Перейти к форме",
    imageAlts: [
      "Схема зон установки сенсора: плечи, живот, бедро и верх ягодиц",
      "Пример фиксации сенсора Sibionics пластырем на коже",
      "Пример сенсора Sibionics с дополнительной прозрачной фиксацией на коже"
    ]
  },
  pl: {
    kicker: "Sibionics GS3 · instalacja",
    title: "Instalacja sensora Sibionics GS3",
    lead:
      "Krótki praktyczny przewodnik: typy sensorów, różnica między oficjalną i zewnętrznymi aplikacjami, miejsca zakładania oraz mocowanie plastrem.",
    orderCta: "Zamów sensor",
    dashboardCta: "Otwórz dashboard CGM",
    productNote: "Sensor CGM · Android · aplikacje zewnętrzne",
    intro: [
      "Chińskie sensory Sibionics pojawiły się na rynku stosunkowo niedawno, ale szybko zyskują popularność. Przede wszystkim dlatego, że ich producenci dość dokładnie odtwarzają konstrukcję włókien Freestyle Libre 1 i 2. Dodatkowo na Androidzie aplikacje zewnętrzne mogą odczytywać dane z tych sensorów nawet do 24 dni.",
      "Sprawdźmy, czy rzeczywiście jest to takie proste i wygodne."
    ],
    typesTitle: "Typy sensorów Sibionics",
    typesParagraphs: [
      "Według dostępnych informacji sensory Sibionics występują w wersjach chińskich i europejskich.",
      "Europejskie sensory mają inny system i aplikacje zewnętrzne na razie nie mogą odczytywać ich danych, dlatego działają tylko 14 dni."
    ],
    infoTitle: "Ważna różnica",
    infoText:
      "Oficjalna aplikacja odczytuje wszystkie sensory tylko przez 14 dni, natomiast aplikacje zewnętrzne, np. Juggluco lub SugarJoy, mogą działać do 24 dni.",
    chinaOnly: "Tylko chińskie sensory mogą działać 24 dni z Androidem i aplikacjami zewnętrznymi.",
    warningTitle: "Pamiętaj",
    warningText:
      "Sensor może działać do 24 dni, ale nie gwarantuje to stabilnej pracy przez cały ten okres. Często po 10-12 dniach wskazania mogą stać się mniej dokładne, mimo że sensor fizycznie działa i przesyła dane.",
    placementTitle: "Instalacja i mocowanie sensora",
    placementIntro:
      "Sensor zakładamy podobnie jak inne systemy ciągłego monitorowania glukozy — w miejscu z odpowiednią ilością tkanki tłuszczowej:",
    placementZones: ["Ramiona", "Brzuch", "Udo", "Górna część pośladków"],
    captions: [
      "Zalecane miejsca zakładania: ramiona, brzuch, uda i górna część pośladków.",
      "Przykład mocowania sensora Sibionics dodatkowym plastrem z zestawu.",
      "Dodatkowe przezroczyste mocowanie pomaga zmniejszyć ryzyko odklejenia podczas noszenia."
    ],
    fixationTitle: "Zalecenia dotyczące mocowania",
    fixationLead: "Aby sensor trzymał się stabilniej przez cały okres noszenia, warto przestrzegać podstawowych zasad przygotowania skóry i mocowania.",
    fixationItems: [
      "Zakładaj sensor na czystą, suchą i odtłuszczoną skórę.",
      "Nie zakładaj sensora na miejsca podrażnione, z bliznami lub narażone na silne tarcie odzieży.",
      "Po założeniu dociśnij plaster po obwodzie, nie naciskając bezpośrednio na sensor.",
      "Przy sporcie, prysznicu lub aktywnym dniu możesz dodatkowo zabezpieczyć sensor przezroczystą folią albo tejpem.",
      "Kontroluj, czy brzeg plastra się nie odkleja; w razie potrzeby podklej go dodatkowym tejpem."
    ],
    sensorInstallTitle: "Instalacja sensora",
    sensorInstallText:
      "Do mocowania w zestawie z sensorem znajduje się dodatkowy plaster, który utrzymuje się przez cały okres pracy sensora. Ważne jest, aby platforma z włóknem była równo umieszczona w aplikatorze.",
    ctaKicker: "Zamówienie GS3",
    ctaTitle: "Potrzebujesz sensora lub transpondera?",
    ctaText: "Na stronie głównej możesz wybrać liczbę sensorów, dodać transponder i zapłacić przez WayForPay.",
    ctaButton: "Przejdź do formularza",
    imageAlts: [
      "Schemat miejsc zakładania sensora: ramiona, brzuch, udo i górna część pośladków",
      "Przykład mocowania sensora Sibionics plastrem na skórze",
      "Przykład sensora Sibionics z dodatkowym przezroczystym mocowaniem na skórze"
    ]
  },
  en: {
    kicker: "Sibionics GS3 · installation",
    title: "Sibionics GS3 sensor installation",
    lead:
      "A short practical guide: sensor types, the difference between the official and third-party apps, placement zones, and adhesive fixation.",
    orderCta: "Order a sensor",
    dashboardCta: "Open CGM dashboard",
    productNote: "CGM sensor · Android · third-party apps",
    intro: [
      "Chinese Sibionics sensors have appeared on the market only recently, but they are quickly gaining popularity. One reason is that their manufacturers closely reproduce the filament design used in Freestyle Libre 1 and 2. In addition, on Android, third-party apps can read data from these sensors for up to 24 days.",
      "Let’s look at whether it is really that simple and convenient."
    ],
    typesTitle: "Types of Sibionics sensors",
    typesParagraphs: [
      "According to the available information, Sibionics sensors come in Chinese and European versions.",
      "European sensors use a different system, and third-party apps cannot currently read their data, so they work for only 14 days."
    ],
    infoTitle: "Important difference",
    infoText:
      "The official app reads any sensor for only 14 days, while third-party apps such as Juggluco or SugarJoy may work for up to 24 days.",
    chinaOnly: "Only Chinese sensors can work for 24 days with Android and third-party apps.",
    warningTitle: "Please note",
    warningText:
      "A sensor may work for up to 24 days, but this does not guarantee stable operation for the entire period. Often after 10-12 days, readings may become less accurate even though the sensor still physically works and transmits data.",
    placementTitle: "Sensor placement and fixation",
    placementIntro:
      "Install the sensor like other glucose monitoring systems — in an area with enough fatty tissue:",
    placementZones: ["Arms", "Abdomen", "Thigh", "Upper buttocks"],
    captions: [
      "Recommended placement zones: arms, abdomen, thighs, and upper buttocks.",
      "Example of Sibionics sensor fixation with the included additional patch.",
      "Additional transparent fixation can help reduce the risk of peeling during wear."
    ],
    fixationTitle: "Fixation recommendations",
    fixationLead: "To help the sensor stay secure throughout the wearing period, follow the basic rules for skin preparation and fixation.",
    fixationItems: [
      "Apply the sensor to clean, dry, and oil-free skin.",
      "Avoid irritated areas, scars, or places where clothing causes strong friction.",
      "After application, press the adhesive around the edges without pressing directly on the sensor.",
      "For sports, showering, or an active day, you can additionally secure the sensor with transparent film or tape.",
      "Check that the patch edge is not lifting; if needed, reinforce it with additional tape."
    ],
    sensorInstallTitle: "Sensor installation",
    sensorInstallText:
      "The sensor kit includes an additional patch for fixation, designed to hold throughout the sensor wear period. Make sure the platform with the filament is positioned evenly in the applicator.",
    ctaKicker: "GS3 order",
    ctaTitle: "Need a sensor or transponder?",
    ctaText: "On the home page you can choose the number of sensors, add a transponder, and pay via WayForPay.",
    ctaButton: "Go to the form",
    imageAlts: [
      "Diagram of sensor placement zones: arms, abdomen, thigh, and upper buttocks",
      "Example of Sibionics sensor fixation with a patch on skin",
      "Example of a Sibionics sensor with additional transparent fixation on skin"
    ]
  }
};

const galleryImages = [
  "/installation/placement-zones.jpg",
  "/installation/sensor-patch.jpg",
  "/installation/sensor-overlay.jpg"
];

export default async function InstallationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = content[locale];

  return (
    <>
      <SaasHeader locale={locale} active="installation" />
      <main>
        <section className="installation-hero">
          <div className="container installation-hero-grid">
            <div>
              <span className="kicker">{t.kicker}</span>
              <h1>{t.title}</h1>
              <p className="lead">{t.lead}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={localePath(locale, "#order")}>
                  {t.orderCta}
                </a>
                <a className="btn btn-secondary" href={localePath(locale, "dashboard")}>
                  {t.dashboardCta}
                </a>
              </div>
            </div>
            <div className="installation-product-card">
              <img src={PRODUCT.images[0].src} alt="Sibionics GS3" />
              <div className="installation-card-note">
                <strong>GS3</strong>
                <span>{t.productNote}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section compact-section">
          <div className="container article-container">
            <article className="article-card">
              {t.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <h2>{t.typesTitle}</h2>
              {t.typesParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              <div className="info-panel">
                <strong>{t.infoTitle}</strong>
                <p>{t.infoText}</p>
              </div>

              <p>{t.chinaOnly}</p>

              <div className="warning-panel">
                <strong>{t.warningTitle}</strong>
                <p>{t.warningText}</p>
              </div>

              <h2>{t.placementTitle}</h2>
              <p>{t.placementIntro}</p>

              <div className="placement-grid">
                {t.placementZones.map((zone) => (
                  <div className="placement-card" key={zone}>
                    <span className="feature-dot" />
                    <strong>{zone}</strong>
                  </div>
                ))}
              </div>

              <div className="installation-gallery">
                <figure className="installation-gallery-card">
                  <img src={galleryImages[0]} alt={t.imageAlts[0]} />
                  <figcaption>{t.captions[0]}</figcaption>
                </figure>
                <div className="installation-gallery-row">
                  {[1, 2].map((index) => (
                    <figure className="installation-gallery-card installation-gallery-card--compact" key={galleryImages[index]}>
                      <img
                        className={index === 1 ? "installation-gallery-image--rotated" : undefined}
                        src={galleryImages[index]}
                        alt={t.imageAlts[index]}
                      />
                      <figcaption>{t.captions[index]}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <div className="fixation-panel">
                <span className="kicker">GS3</span>
                <h2>{t.fixationTitle}</h2>
                <p>{t.fixationLead}</p>
                <ul>
                  {t.fixationItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <h2>{t.sensorInstallTitle}</h2>
              <p>{t.sensorInstallText}</p>

              <div className="article-cta">
                <div>
                  <span className="kicker">{t.ctaKicker}</span>
                  <h2>{t.ctaTitle}</h2>
                  <p className="muted">{t.ctaText}</p>
                </div>
                <a className="btn btn-primary" href={localePath(locale, "#order")}>
                  {t.ctaButton}
                </a>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
