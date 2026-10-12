// Policy Tracker Data — "Policy Intelligence Feed"
// Unified schema for two content types: government actions (lex.uz) and international reports (IMF, WB, ADB, EBRD, UNDP).
// Auto-generated from research by MCP tools; hand-seeded for v0.2.0.

window.POLICY_TRACKER_DATA = {
  meta: {
    version: "0.2.0",
    lastUpdated: "2026-04-17",
  },

  // ── Tag dictionary ──
  tags: {
    wto:         { icon: "🌐", color: "#2563eb", label: { en: "WTO",         ru: "ВТО",                 uz: "JTO" } },
    tax:         { icon: "🧾", color: "#0ea5e9", label: { en: "Tax",         ru: "Налоги",              uz: "Soliq" } },
    trade:       { icon: "🚢", color: "#14b8a6", label: { en: "Trade",       ru: "Торговля",            uz: "Savdo" } },
    monetary:    { icon: "🏦", color: "#8b5cf6", label: { en: "Monetary",    ru: "Монетарная",          uz: "Monetar" } },
    fiscal:      { icon: "💰", color: "#f59e0b", label: { en: "Fiscal",      ru: "Фискальная",          uz: "Fiskal" } },
    digital:     { icon: "💻", color: "#6366f1", label: { en: "Digital",     ru: "Цифровизация",        uz: "Raqamlashtirish" } },
    energy:      { icon: "⚡", color: "#eab308", label: { en: "Energy",      ru: "Энергетика",          uz: "Energetika" } },
    agriculture: { icon: "🌾", color: "#22c55e", label: { en: "Agriculture", ru: "Сельское хозяйство",  uz: "Qishloq xo'jaligi" } },
    banking:     { icon: "🏛️", color: "#2563eb", label: { en: "Banking",     ru: "Банки",               uz: "Banklar" } },
    structural:  { icon: "🏗️", color: "#10b981", label: { en: "Structural",  ru: "Структурная",         uz: "Tarkibiy" } },
    soe:         { icon: "🏢", color: "#64748b", label: { en: "SOE",         ru: "Госпредприятия",      uz: "Davlat korxonalari" } },
    environment: { icon: "🌱", color: "#16a34a", label: { en: "Environment", ru: "Экология",            uz: "Ekologiya" } },
    labor:       { icon: "👥", color: "#f97316", label: { en: "Labor",       ru: "Рынок труда",         uz: "Mehnat bozori" } },
    macro:       { icon: "📊", color: "#0ea5e9", label: { en: "Macro",       ru: "Макроэкономика",      uz: "Makroiqtisodiyot" } },
    poverty:     { icon: "🤝", color: "#ec4899", label: { en: "Poverty",     ru: "Бедность",            uz: "Kambag'allik" } },
    governance:  { icon: "⚖️", color: "#7c3aed", label: { en: "Governance",  ru: "Управление",          uz: "Boshqaruv" } },
  },

  // ── Status dictionary (government entries only) ──
  statuses: {
    planned:   { color: "#64748b", label: { en: "Planned",     ru: "План",        uz: "Rejalangan"  } },
    active:    { color: "#2563eb", label: { en: "In Progress", ru: "В работе",    uz: "Jarayonda"   } },
    completed: { color: "#16a34a", label: { en: "Completed",   ru: "Завершено",   uz: "Yakunlangan" } },
  },

  // ── Document type dictionary (government) ──
  docTypes: {
    presidential_decree:     { label: { en: "Presidential Decree",     ru: "Указ Президента",          uz: "Prezident farmoni" } },
    presidential_resolution: { label: { en: "Presidential Resolution", ru: "Постановление Президента", uz: "Prezident qarori" } },
    cabinet_resolution:      { label: { en: "Cabinet Resolution",      ru: "Постановление Кабмина",    uz: "Vazirlar Mahkamasi qarori" } },
    law:                     { label: { en: "Law",                     ru: "Закон",                    uz: "Qonun" } },
    ministry_order:          { label: { en: "Ministry Order",          ru: "Приказ министерства",      uz: "Vazirlik buyrug'i" } },
  },

  // ── Organization dictionary (international) ──
  organizations: {
    imf:       { icon: "🏛️", color: "#003087", label: "IMF",        fullName: { en: "International Monetary Fund", ru: "Международный валютный фонд", uz: "Xalqaro valyuta fondi" } },
    worldbank: { icon: "🌍", color: "#009fda", label: "World Bank", fullName: { en: "World Bank",                  ru: "Всемирный банк",              uz: "Jahon banki" } },
    adb:       { icon: "🏦", color: "#00529b", label: "ADB",        fullName: { en: "Asian Development Bank",      ru: "Азиатский банк развития",      uz: "Osiyo taraqqiyot banki" } },
    ebrd:      { icon: "🏢", color: "#00953b", label: "EBRD",       fullName: { en: "European Bank for Reconstruction and Development", ru: "Европейский банк реконструкции и развития", uz: "Yevropa tiklanish va taraqqiyot banki" } },
    undp:      { icon: "🇺🇳", color: "#418fde", label: "UNDP",       fullName: { en: "UN Development Programme",    ru: "Программа развития ООН",      uz: "BMT Taraqqiyot dasturi" } },
  },

  // ── Report type dictionary (international) ──
  reportTypes: {
    article_iv:         { label: { en: "Article IV",         ru: "Статья IV",        uz: "IV-modda" } },
    country_report:     { label: { en: "Country Report",     ru: "Страновой отчёт",  uz: "Mamlakat hisoboti" } },
    outlook:            { label: { en: "Outlook",            ru: "Обзор",            uz: "Istiqbol" } },
    sector_assessment:  { label: { en: "Sector Assessment",  ru: "Отраслевая оценка", uz: "Tarmoq bahosi" } },
    evaluation:         { label: { en: "Evaluation",         ru: "Оценка",           uz: "Baholash" } },
    brief:              { label: { en: "Policy Brief",       ru: "Обзор политики",   uz: "Siyosat sharhi" } },
  },

  // ═══════════════════════════════════════════════════════════
  // ENTRIES — 6 government (lex.uz) + 6 international
  // ═══════════════════════════════════════════════════════════
  entries: [

    // ── 1. Presidential Resolution PQ-136 — E-commerce bond warehouses ──
    {
      id: "pq-136-ecommerce-bond-2026",
      type: "government",
      title: {
        en: "Measures for Further Development of E-commerce — Bond Warehouses",
        ru: "О мерах по дальнейшему развитию электронной коммерции — бонд-склады",
        uz: "Elektron tijorat sohasini rivojlantirish chora-tadbirlari — bond omborlari",
      },
      summary: {
        en: "Targets 30 trillion som e-commerce turnover and $300M investment by 2030. Establishes special bond warehouses (2026-2028 experiment) for goods sold via e-commerce platforms to individuals. Annex 1: 5% unified customs duty on electronics (smartphones, laptops, appliances); Annex 2: VAT + 3% duty on clothing/knitwear.",
        ru: "Целевые показатели: 30 трлн сум оборота электронной коммерции и $300 млн инвестиций к 2030 году. Вводятся бонд-склады (эксперимент 2026-2028) для товаров, продаваемых физлицам через электронные платформы. Приложение 1: единая пошлина 5% на электронику; Приложение 2: НДС + 3% на одежду и трикотаж.",
        uz: "2030-yilgacha 30 trln so'm elektron tijorat aylanmasi va $300 mln investitsiya belgilangan. Elektron platformalar orqali jismoniy shaxslarga sotiladigan tovarlar uchun bond omborlari joriy etiladi (2026-2028 tajriba). 1-ilova: elektronika uchun 5% yagona boj; 2-ilova: kiyim va trikotaj uchun QQS + 3% boj.",
      },
      date: "2026-04-13",
      endDate: "2030-12-31",
      tags: ["trade", "digital", "fiscal", "tax"],
      linkedModels: ["pe", "cge", "fpp"],
      sourceUrl: "https://lex.uz/docs/8131421",
      docNumber: "ПҚ-136",
      docType: "presidential_resolution",
      issuer: "president",
      scope: "national",
      status: "active",
      parentDoc: null,
    },

    // ── 2. Cabinet Resolution 162 — Greenhouse relocation to Surkhandarya ──
    {
      id: "res-162-greenhouse-surkhandarya-2026",
      type: "government",
      title: {
        en: "Greenhouse Farming Development in Surkhandarya Region",
        ru: "Развитие тепличных хозяйств в Сурхандарьинской области",
        uz: "Surxondaryo viloyatida issiqxona xo'jaliklarini rivojlantirish",
      },
      summary: {
        en: "Relocates polluting greenhouses from Tashkent to the new 'Surkhan-Agro' FEZ. Incentives: 5-year credit repayment with 3-year grace, up to 500K som/ha dismantling compensation. Sticks: gas cut-off and 5× water tariffs from Aug 2026, 20× pollution fines, 10× land/property tax for non-compliant operations.",
        ru: "Перенос проблемных теплиц из Ташкента в новую СЭЗ 'Сурхан-Агро'. Стимулы: 5-летний срок погашения кредита с 3-летним льготным периодом, компенсация до 500 тыс. сум/га на демонтаж. Меры принуждения: отключение газа и 5-кратные тарифы на воду с августа 2026, 20-кратные штрафы за загрязнение, 10-кратный земельный и имущественный налог.",
        uz: "Muammoli issiqxonalarni Toshkentdan yangi 'Surxon-Agro' EIZga ko'chirish. Rag'batlar: 5-yillik kredit muddati 3 yil imtiyoz davri bilan, demontaj uchun gektar uchun 500 ming so'mgacha kompensatsiya. Majburlash choralari: 2026 yil avgustdan gaz uzish va 5 barobar suv tariflari, 20 barobar ifloslantirish jarimalari, 10 barobar yer va mulk solig'i.",
      },
      date: "2026-04-09",
      endDate: "2028-12-31",
      tags: ["agriculture", "environment", "fiscal", "tax"],
      linkedModels: ["io", "cge", "fpp"],
      sourceUrl: "https://lex.uz/docs/8128922",
      docNumber: "№ 162",
      docType: "cabinet_resolution",
      issuer: "cabinet",
      scope: "surkhandarya",
      status: "active",
      parentDoc: "pq-108-surkhan-agro-fez-2026",
    },

    // ── 3. Presidential Decree PF-21 — Uzbekistan-2030 next phase ──
    {
      id: "pf-21-uzbekistan-2030-phase-2026",
      type: "government",
      title: {
        en: "Uzbekistan-2030 Strategy — Next Phase of Reforms",
        ru: "Стратегия 'Узбекистан-2030' — следующий этап реформ",
        uz: "'O'zbekiston-2030' strategiyasi — islohotlarning keyingi bosqichi",
      },
      summary: {
        en: "Outlines the next phase of the national development strategy through 2030, covering governance reform, judicial independence, market liberalization, and priority economic directions. Anchors the annual state programs and ministerial roadmaps.",
        ru: "Определяет следующий этап стратегии национального развития до 2030 года, охватывающий реформу управления, независимость судебной системы, либерализацию рынков и приоритетные экономические направления.",
        uz: "2030 yilgacha milliy taraqqiyot strategiyasining keyingi bosqichini belgilaydi: boshqaruv islohoti, sud mustaqilligi, bozor liberallashtirish va ustuvor iqtisodiy yo'nalishlar.",
      },
      date: "2026-02-16",
      endDate: "2030-12-31",
      tags: ["structural", "governance", "macro"],
      linkedModels: ["cge", "fpp", "qpm"],
      sourceUrl: "https://lex.uz/docs/8050769",
      docNumber: "ПФ-21",
      docType: "presidential_decree",
      issuer: "president",
      scope: "national",
      status: "active",
      parentDoc: null,
    },

    // ── 4. Presidential Decree PF-22 — 2026 state program ──
    {
      id: "pf-22-state-program-2026",
      type: "government",
      title: {
        en: "State Program for 2026 — Year of Community Development",
        ru: "Государственная программа на 2026 год — Год развития махалли",
        uz: "2026-yil davlat dasturi — Mahalla rivojlanishi yili",
      },
      summary: {
        en: "The annual state reform program for 2026, operationalizing the Uzbekistan-2030 strategy. Theme: community (mahalla) development. Covers community infrastructure, local governance strengthening, judicial-system reforms, and targeted social support.",
        ru: "Годовая государственная программа реформ на 2026 год в рамках стратегии 'Узбекистан-2030'. Тема года — развитие махалли. Охватывает инфраструктуру, местное управление, судебную систему, адресную социальную поддержку.",
        uz: "'O'zbekiston-2030' strategiyasi doirasida 2026-yilga mo'ljallangan yillik davlat islohot dasturi. Yil mavzusi — mahalla rivojlanishi. Infratuzilma, mahalliy boshqaruv, sud tizimi va ijtimoiy yordam masalalarini qamrab oladi.",
      },
      date: "2026-02-16",
      endDate: "2026-12-31",
      tags: ["governance", "structural", "fiscal"],
      linkedModels: ["cge", "fpp"],
      sourceUrl: "https://lex.uz/docs/8050787",
      docNumber: "ПФ-22",
      docType: "presidential_decree",
      issuer: "president",
      scope: "national",
      status: "active",
      parentDoc: "pf-21-uzbekistan-2030-phase-2026",
    },

    // ── 5. Presidential Decree PF-4 — Light industry export expansion ──
    {
      id: "pf-4-light-industry-exports-2026",
      type: "government",
      title: {
        en: "Expanding Light Industry Participation in Global Supply Chains",
        ru: "Расширение участия лёгкой промышленности в глобальных цепочках",
        uz: "Yengil sanoatning global ta'minot zanjirlariga kengroq kirishi",
      },
      summary: {
        en: "Targets export-oriented growth for Uzbekistan's textile and apparel sector. Introduces export subsidies, certification support, and logistics corridor financing to deepen integration into EU, Turkish, and GCC supply chains.",
        ru: "Целевой экспортно-ориентированный рост текстильной и швейной отраслей. Вводятся экспортные субсидии, поддержка сертификации и финансирование логистических коридоров для интеграции в цепочки ЕС, Турции и GCC.",
        uz: "O'zbekistonning to'qimachilik va kiyim-kechak tarmog'i uchun eksportga yo'naltirilgan o'sish maqsadi. Eksport subsidiyalari, sertifikatlash yordami va logistika koridorlarini moliyalashtirish joriy etiladi.",
      },
      date: "2026-01-12",
      endDate: "2028-12-31",
      tags: ["trade", "structural"],
      linkedModels: ["pe", "io", "cge"],
      sourceUrl: "https://lex.uz/ru/doc-passport/7994710",
      docNumber: "ПФ-4",
      docType: "presidential_decree",
      issuer: "president",
      scope: "national",
      status: "active",
      parentDoc: null,
    },

    // ── 6. Law ORQ-1108 — 2026 Tax & Budget Policy omnibus ──
    {
      id: "orq-1108-tax-budget-2026",
      type: "government",
      title: {
        en: "Tax & Budget Policy Amendments for 2026",
        ru: "Изменения налогово-бюджетной политики на 2026 год",
        uz: "2026-yilga soliq va byudjet siyosatiga o'zgartirishlar",
      },
      summary: {
        en: "Omnibus law adjusting the Tax Code for 2026. Raises excise on alcohol, tobacco, sugary drinks; introduces a chips (crisps) excise; revises marketplace tax rates; updates IT Park eligibility — payment organizations, marketplaces, and microfinance lose IT Park exemptions from April 2026.",
        ru: "Омнибус-закон, корректирующий Налоговый кодекс на 2026 год. Повышены акцизы на алкоголь, табак, сладкие напитки; введён акциз на чипсы; пересмотрены ставки для маркетплейсов; платёжные организации, маркетплейсы и МФО теряют льготы IT Park с апреля 2026.",
        uz: "Soliq kodeksini 2026 yilga moslashtirgan omnibus qonuni. Alkogol, tamaki, shirin ichimliklarga aktsiz oshiriladi; chips uchun aktsiz kiritildi; marketpleys stavkalari qayta ko'rib chiqildi; to'lov tashkilotlari, marketpleyslar va mikromoliya 2026-yil apreldan IT Park imtiyozini yo'qotadi.",
      },
      date: "2025-12-25",
      endDate: "2026-12-31",
      tags: ["tax", "fiscal", "digital"],
      linkedModels: ["fpp", "cge"],
      sourceUrl: "https://www.lex.uz/uz/docs/7944527",
      docNumber: "ЎРҚ-1108",
      docType: "law",
      issuer: "parliament",
      scope: "national",
      status: "active",
      parentDoc: null,
    },

    // ═══════════════════════════════════════════════════════════
    // INTERNATIONAL ASSESSMENTS
    // ═══════════════════════════════════════════════════════════

    // ── 7. IMF Article IV 2026 Staff Concluding Statement ──
    {
      id: "imf-article-iv-2026",
      type: "international",
      title: {
        en: "Uzbekistan: 2026 Article IV Staff Concluding Statement",
        ru: "Узбекистан: заявление по итогам миссии МВФ 2026 (Статья IV)",
        uz: "O'zbekiston: XVF 2026 IV-modda missiyasi yakuniy bayonoti",
      },
      summary: {
        en: "IMF projects 6.8% growth for 2026 after 7.7% in 2025. Headline CPI down to 7.3% but core inflation edging up to 6.3%. Policy rate held at 14%. Recommends minimizing within-year spending increases, continued exchange-rate flexibility, and SOE reform. Risks: Middle East war, gold concentration.",
        ru: "МВФ прогнозирует рост 6,8% в 2026 году после 7,7% в 2025. Общий ИПЦ снизился до 7,3%, базовая инфляция выросла до 6,3%. Ставка сохраняется на 14%. Рекомендуется ограничить внутригодовой рост расходов, продолжить гибкость обменного курса и реформу ГП. Риски: конфликт на Ближнем Востоке, концентрация золота.",
        uz: "XVF 2026-yilda 6,8% o'sishni taxmin qilmoqda (2025-yil 7,7%). Umumiy ISI 7,3% gacha tushdi, lekin asosiy inflyatsiya 6,3% ga ko'tarildi. Siyosat stavkasi 14% da. Xarajatlarni yil ichida cheklash, valyuta kursi moslashuvchanligi va davlat korxonalari islohini davom ettirish tavsiya etilmoqda.",
      },
      date: "2026-04-13",
      tags: ["macro", "monetary", "fiscal"],
      linkedModels: ["qpm", "dfm", "fpp"],
      sourceUrl: "https://www.imf.org/en/news/articles/2026/04/13/mcs041326-uzbekistan",
      organization: "imf",
      reportType: "article_iv",
    },

    // ── 8. World Bank Macro Poverty Outlook — April 2026 ──
    {
      id: "wb-mpo-uzbekistan-2026-04",
      type: "international",
      title: {
        en: "World Bank Macro Poverty Outlook — Uzbekistan (April 2026)",
        ru: "Макроэкономический обзор бедности Всемирного банка — Узбекистан (апрель 2026)",
        uz: "Jahon banki makroiqtisodiy kambag'allik istiqbolli — O'zbekiston (aprel 2026)",
      },
      summary: {
        en: "Projects 6.4% GDP growth in 2026 and 6.7% in 2027. Remittances surged 37% and now stand at ~13% of GDP. FDI exceeded $20B in first three quarters of 2025 (+75% YoY). Poverty reduction continues but pace moderating as labor-market absorption slows.",
        ru: "Прогноз роста ВВП 6,4% в 2026 и 6,7% в 2027. Денежные переводы выросли на 37% и составляют ~13% ВВП. ПИИ превысили $20 млрд за первые три квартала 2025 (+75% г/г). Сокращение бедности продолжается, но темпы замедляются.",
        uz: "2026-yilda YaIM 6,4%, 2027-yilda 6,7% o'sishni bashorat qilmoqda. Pul o'tkazmalari 37% ga oshdi va YaIMning ~13% ni tashkil qiladi. 2025-yilning dastlabki uch choragida TCHI $20 mlrd dan oshdi (+75% yillik). Kambag'allikni kamaytirish davom etmoqda.",
      },
      date: "2026-04-01",
      tags: ["macro", "poverty", "labor"],
      linkedModels: ["dfm", "fpp", "cge"],
      sourceUrl: "https://thedocs.worldbank.org/en/doc/d5f32ef28464d01f195827b7e020a3e8-0500022021/related/mpo-uzb.pdf",
      organization: "worldbank",
      reportType: "outlook",
    },

    // ── 9. ADB Asian Development Outlook April 2026 ──
    {
      id: "adb-ado-uzbekistan-2026-04",
      type: "international",
      title: {
        en: "ADB Asian Development Outlook April 2026 — Uzbekistan",
        ru: "Прогноз развития Азии АБР, апрель 2026 — Узбекистан",
        uz: "OTB Osiyo taraqqiyot istiqbolli, aprel 2026 — O'zbekiston",
      },
      summary: {
        en: "ADB projects 6.7% growth in 2026 and 6.8% in 2027, driven by services and investment. Inflation forecast at 6.5%. Flags gold export concentration as vulnerability, SOE reform pace as downside risk, and WTO accession as a key reform anchor.",
        ru: "АБР прогнозирует рост 6,7% в 2026 и 6,8% в 2027, основанный на услугах и инвестициях. Инфляция 6,5%. Отмечает зависимость от экспорта золота, темпы реформы ГП как нисходящий риск, вступление в ВТО как якорь реформ.",
        uz: "OTB 2026-yilda 6,7%, 2027-yilda 6,8% o'sishni bashorat qilmoqda. Inflyatsiya 6,5%. Oltin eksportiga bog'liqlik va davlat korxonalari islohining sur'ati xavf sifatida belgilandi, JTOga qo'shilish asosiy islohot yo'nalishidir.",
      },
      date: "2026-04-01",
      tags: ["macro", "trade", "soe", "wto"],
      linkedModels: ["cge", "pe", "fpp", "dfm"],
      sourceUrl: "https://www.adb.org/outlook/editions/april-2026",
      organization: "adb",
      reportType: "outlook",
    },

    // ── 10. EBRD Transition Report 2025-26 ──
    {
      id: "ebrd-transition-2025-26",
      type: "international",
      title: {
        en: "EBRD Transition Report 2025-26 — Uzbekistan Assessment",
        ru: "Отчёт о переходном процессе ЕБРР 2025-26 — Узбекистан",
        uz: "YeTTB 2025-26 o'tish hisoboti — O'zbekiston bahosi",
      },
      summary: {
        en: "EBRD projects 6.0% growth in 2026 after 6.7% in 2025. Remittance-driven demand (+28.7% growth) powers services expansion. Highlights SME financing gaps, green transition financing needs, and over $1B EBRD commitment in 2025.",
        ru: "ЕБРР прогнозирует рост 6,0% в 2026 после 6,7% в 2025. Денежные переводы (+28,7%) стимулируют расширение услуг. Подчёркиваются пробелы в финансировании МСП, потребности зелёного перехода, более $1 млрд обязательств ЕБРР в 2025.",
        uz: "YeTTB 2026-yilda 6,0% o'sishni taxmin qilmoqda (2025-yil 6,7%). Pul o'tkazmalari o'sishi (+28,7%) xizmatlar kengayishini qo'llab-quvvatlaydi. KOB moliyalashtirish kamchiliklari va yashil o'tish zaruratlari ta'kidlandi.",
      },
      date: "2025-11-01",
      tags: ["macro", "banking", "environment"],
      linkedModels: ["fpp", "cge", "qpm"],
      sourceUrl: "https://www.ebrd.com/content/dam/ebrd_dxp/assets/pdfs/office-of-the-chief-economist/transition-report-archive/transition-report-2025/country-assessments/Regional-Groupings/transition-report-2025-26-CA-Central-Asia.pdf",
      organization: "ebrd",
      reportType: "country_report",
    },

    // ── 11. World Bank Country Economic Memorandum 2025 ──
    {
      id: "wb-cem-uzbekistan-2025",
      type: "international",
      title: {
        en: "World Bank CEM — Fostering Private Sector-Led Growth and Global Integration",
        ru: "Страновой экономический меморандум ВБ — Частный сектор и глобальная интеграция",
        uz: "Jahon banki mamlakat iqtisodiy memorandumi — Xususiy sektor va global integratsiya",
      },
      summary: {
        en: "Flagship analytical report on accelerating private-sector-led growth and deepening integration into global value chains. Priority sectors: chemicals, ICT, horticulture. Recommends FDI climate improvements, competition policy strengthening, and deeper trade agreement participation.",
        ru: "Флагманский аналитический отчёт об ускорении роста на основе частного сектора и интеграции в глобальные цепочки создания стоимости. Приоритетные секторы: химия, ИКТ, садоводство. Рекомендации: улучшение климата ПИИ, укрепление политики конкуренции, углубление торговых соглашений.",
        uz: "Xususiy sektor asosidagi o'sishni tezlashtirish va global qiymat zanjirlariga integratsiyani chuqurlashtirish bo'yicha asosiy analitik hisobot. Ustuvor tarmoqlar: kimyo, AKT, bog'dorchilik. TCHI muhitini yaxshilash, raqobat siyosatini mustahkamlash tavsiya etilmoqda.",
      },
      date: "2025-06-01",
      tags: ["structural", "trade", "macro"],
      linkedModels: ["pe", "io", "cge"],
      sourceUrl: "https://www.worldbank.org/en/country/uzbekistan/publication/cem-2025",
      organization: "worldbank",
      reportType: "country_report",
    },

    // ── 12. UNDP Independent Country Programme Evaluation ──
    {
      id: "undp-icpe-uzbekistan-2025",
      type: "international",
      title: {
        en: "UNDP Independent Country Programme Evaluation — Uzbekistan",
        ru: "Независимая оценка страновой программы ПРООН — Узбекистан",
        uz: "BMTTD mustaqil mamlakat dasturi bahosi — O'zbekiston",
      },
      summary: {
        en: "Independent evaluation of UNDP's 2022-2026 country programme. Assesses contributions across inclusive growth, democratic governance, climate adaptation, and SDG localization. Identifies gaps in monitoring, highlights strengths in judicial reform and environmental resilience work.",
        ru: "Независимая оценка страновой программы ПРООН 2022-2026. Оценивается вклад в инклюзивный рост, демократическое управление, адаптацию к климату, локализацию ЦУР. Выявлены пробелы в мониторинге, подчёркнуты успехи в судебной реформе и экологической устойчивости.",
        uz: "BMTTD 2022-2026 mamlakat dasturining mustaqil bahosi. Inklyuziv o'sish, demokratik boshqaruv, iqlimga moslashish va BRMlarni mahalliylashtirish bo'yicha hissasini baholaydi. Monitoring kamchiliklari aniqlandi, sud islohi va ekologik barqarorlikdagi yutuqlar ta'kidlandi.",
      },
      date: "2025-07-01",
      tags: ["governance", "environment", "structural"],
      linkedModels: ["cge", "fpp"],
      sourceUrl: "https://www.undp.org/sites/g/files/zskgke326/files/2025-07/icpe-uzbekistan-main-report.pdf",
      organization: "undp",
      reportType: "evaluation",
    },
  ],
};
