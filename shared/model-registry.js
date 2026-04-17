window.MODEL_REGISTRY = {
  meta: {
    version: "0.2.0",
    lastUpdated: "2026-04-16",
  },
  models: [
    /* ═══════════════════════════════════════════════════════════
       QPM — Quarterly Projection Model (19 parameters)
    ═══════════════════════════════════════════════════════════ */
    {
      id: "qpm",
      name: { en: "Quarterly Projection Model", ru: "Квартальная прогнозная модель", uz: "Choraklik prognoz modeli" },
      type: "New-Keynesian DSGE",
      frequency: "Quarterly",
      status: "active",
      parameters: [
        /* IS Curve — Aggregate Demand */
        { name: "b1", symbol: "b₁", value: 0.70, min: 0.30, max: 0.95, step: 0.05, type: "structural", equation: "IS",
          description: { en: "Gap persistence — inertia in output gap dynamics.", ru: "Инерция разрыва выпуска.", uz: "Ishlab chiqarish tafovuti inertsiyasi." } },
        { name: "b2", symbol: "b₂", value: 0.20, min: 0.05, max: 0.60, step: 0.05, type: "structural", equation: "IS",
          description: { en: "MCI sensitivity — monetary policy transmission to demand.", ru: "Чувствительность к денежно-кредитным условиям.", uz: "Pul-kredit sharoitlariga sezgirlik." } },
        { name: "b3", symbol: "b₃", value: 0.30, min: 0.05, max: 0.60, step: 0.05, type: "structural", equation: "IS",
          description: { en: "External demand — foreign output gap spillover.", ru: "Перелив внешнего разрыва выпуска.", uz: "Tashqi ishlab chiqarish tafovuti ta'siri." } },
        { name: "b4", symbol: "b₄", value: 0.60, min: 0.10, max: 0.90, step: 0.10, type: "structural", equation: "MCI",
          description: { en: "IR weight in MCI — interest rate vs exchange rate (1−b₄).", ru: "Вес процентной ставки в MCI (vs валютного курса).", uz: "MCI da foiz stavkasi ulushi (valyuta kursiga nisbatan)." } },
        /* Phillips Curve — Inflation */
        { name: "a1", symbol: "a₁", value: 0.60, min: 0.30, max: 0.90, step: 0.05, type: "structural", equation: "Phillips",
          description: { en: "Inflation persistence — backward-looking expectations share.", ru: "Инерция инфляции — доля адаптивных ожиданий.", uz: "Inflyatsiya inertsiyasi — orqaga qarab kutishlar ulushi." } },
        { name: "a2", symbol: "a₂", value: 0.20, min: 0.05, max: 0.50, step: 0.05, type: "structural", equation: "Phillips",
          description: { en: "Marginal cost pass-through — RMC impact on inflation (updated from 0.15).", ru: "Передача предельных издержек в инфляцию (обновлено с 0.15).", uz: "Chegara xarajatlarining inflyatsiyaga ta'siri (0.15 dan yangilangan)." } },
        { name: "a3", symbol: "a₃", value: 0.65, min: 0.20, max: 0.90, step: 0.05, type: "structural", equation: "RMC",
          description: { en: "Domestic cost share — domestic vs imported inflation in RMC (updated from 0.60).", ru: "Доля внутренних издержек в RMC (обновлено с 0.60).", uz: "RMC dagi ichki xarajatlar ulushi (0.60 dan yangilangan)." } },
        /* Taylor Rule — Monetary Policy */
        { name: "g1", symbol: "g₁", value: 0.80, min: 0.30, max: 0.95, step: 0.05, type: "structural", equation: "Taylor",
          description: { en: "Rate smoothing — CBU gradualism in rate adjustments.", ru: "Сглаживание ставки — постепенность ЦБ.", uz: "Stavkani tekislash — MB bosqichma-bosqichligi." } },
        { name: "g2", symbol: "g₂", value: 1.50, min: 1.00, max: 3.00, step: 0.10, type: "structural", equation: "Taylor",
          description: { en: "Inflation response — Taylor principle: must be >1 for stability.", ru: "Реакция на инфляцию — принцип Тейлора: должен быть >1.", uz: "Inflyatsiyaga javob — Teylor printsipi: barqarorlik uchun >1 bo'lishi kerak." } },
        { name: "g3", symbol: "g₃", value: 0.50, min: 0.10, max: 1.50, step: 0.10, type: "structural", equation: "Taylor",
          description: { en: "Output gap response — weight on economic activity.", ru: "Реакция на разрыв выпуска — вес экономической активности.", uz: "Ishlab chiqarish tafovutiga javob — iqtisodiy faollik vazni." } },
        /* UIP */
        { name: "e1", symbol: "e₁", value: 0.70, min: 0.10, max: 0.90, step: 0.10, type: "structural", equation: "UIP",
          description: { en: "UIP backward weight — UZS backward-looking share (limited FX market depth).", ru: "Ретроспективный вес UIP — ограниченная глубина валютного рынка.", uz: "UIP orqaga qarab vazni — valyuta bozori chuqurligi cheklangan." } },
        /* Steady-State */
        { name: "ssTar", symbol: "π*", value: 5.0, min: 3.0, max: 12.0, step: 0.5, type: "calibration", equation: "Taylor",
          description: { en: "CBU medium-term inflation target (%).", ru: "Среднесрочная цель ЦБ по инфляции (%).", uz: "MB o'rta muddatli inflyatsiya maqsadi (%)." } },
        { name: "ssRRbar", symbol: "r̄", value: 3.5, min: 1.0, max: 8.0, step: 0.5, type: "calibration", equation: "Taylor",
          description: { en: "Neutral real rate — structural premium over EM average (%).", ru: "Нейтральная реальная ставка — структурная премия (%).", uz: "Neytral haqiqiy stavka — tuzilmaviy ustama (%)." } },
        { name: "ssGdpbar", symbol: "ȳ", value: 6.0, min: 2.0, max: 10.0, step: 0.5, type: "calibration", equation: "IS",
          description: { en: "Potential GDP growth rate (%).", ru: "Потенциальный рост ВВП (%).", uz: "Potensial YaIM o'sish sur'ati (%)." } },
        /* Simulation settings */
        { name: "shkSz", symbol: "shock", value: 1.0, min: 0.25, max: 5.0, step: 0.25, type: "simulation", equation: "—",
          description: { en: "Shock size in percentage points.", ru: "Размер шока (п.п.).", uz: "Shok kattaligi (foiz punkti)." } },
        { name: "horizon", symbol: "T", value: 20, min: 8, max: 32, step: 4, type: "simulation", equation: "—",
          description: { en: "Simulation horizon in quarters.", ru: "Горизонт симуляции (кварталы).", uz: "Simulyatsiya gorizonti (chorak)." } },
        /* Baseline inputs */
        { name: "bl_pi", symbol: "π₀", value: 10.5, min: 0, max: 30, step: 0.5, type: "initial_condition", equation: "Phillips",
          description: { en: "Starting inflation YoY (%).", ru: "Начальная инфляция (г/г, %).", uz: "Boshlang'ich inflyatsiya (y/y, %)." } },
        { name: "bl_rs", symbol: "i₀", value: 13.5, min: 0, max: 30, step: 0.25, type: "initial_condition", equation: "Taylor",
          description: { en: "Starting CBU policy rate (%).", ru: "Начальная ставка ЦБ (%).", uz: "MB boshlang'ich stavkasi (%)." } },
        { name: "bl_gap", symbol: "gap₀", value: -1.5, min: -10, max: 10, step: 0.25, type: "initial_condition", equation: "IS",
          description: { en: "Starting output gap (%).", ru: "Начальный разрыв выпуска (%).", uz: "Boshlang'ich ishlab chiqarish tafovuti (%)." } },
      ],
      equations: [
        { id: "is", name: "IS Curve", formula: "gap_t = b₁·gap_{t-1} − b₂·MCI_t + b₃·gap*_t + ε_gap" },
        { id: "phillips", name: "Phillips Curve", formula: "π_t = a₁·π_{t-1} + (1−a₁)·Eπ_{t+1} + a₂·RMC_t + ε_π" },
        { id: "taylor", name: "Taylor Rule", formula: "i_t = g₁·i_{t-1} + (1−g₁)·[r̄ + π* + g₂·(π4_{t+4}−π*) + g₃·gap_t] + ε_i" },
        { id: "uip", name: "UIP Condition", formula: "s_t = (1−e₁)·Es_{t+1} + e₁·s_{t-1} − (i_t−i*_t)/4 + ε_s" },
        { id: "mci", name: "MCI", formula: "MCI = b₄·RR_gap − (1−b₄)·Z_gap" },
        { id: "rmc", name: "Real Marginal Cost", formula: "RMC = a₃·gap + (1−a₃)·Z_gap" },
      ],
      dataSources: [
        { institution: "Central Bank of Uzbekistan", description: { en: "Policy rate, CPI, monetary aggregates, exchange rate", ru: "Ставка, ИПЦ, денежные агрегаты, валютный курс", uz: "Stavka, NBI, pul agregatlari, valyuta kursi" }, url: "https://cbu.uz/" },
        { institution: { en: "Statistics Agency of Uzbekistan", ru: "Агентство статистики", uz: "Statistika agentligi" }, description: { en: "GDP, national accounts, deflators", ru: "ВВП, национальные счета, дефляторы", uz: "YaIM, milliy hisoblar, deflyatorlar" }, url: "https://stat.uz/" },
      ],
      flowchart: [
        { from: "Demand Shock", to: "Output Gap (IS)" },
        { from: "Output Gap (IS)", to: "Inflation (Phillips)" },
        { from: "Inflation (Phillips)", to: "Policy Rate (Taylor)" },
        { from: "Policy Rate (Taylor)", to: "Exchange Rate (UIP)" },
        { from: "Exchange Rate (UIP)", to: "MCI → Output Gap (IS)" },
      ],
    },

    /* ═══════════════════════════════════════════════════════════
       DFM — Dynamic Factor Model / GDP Nowcasting
    ═══════════════════════════════════════════════════════════ */
    {
      id: "dfm",
      name: { en: "GDP Nowcasting (DFM)", ru: "Наукастинг ВВП (DFM)", uz: "YaIM naукастинги (DFM)" },
      type: "Dynamic Factor Model",
      frequency: "Monthly → Quarterly",
      status: "active",
      parameters: [
        { name: "lambda_industry", symbol: "λ_ind", value: 0.84, min: 0.0, max: 1.0, step: 0.01, type: "loading", equation: "Measurement",
          description: { en: "Industry sector loading on latent GDP factor.", ru: "Нагрузка промышленности на скрытый фактор ВВП.", uz: "Sanoatning yashirin YaIM faktoriga yuklamasi." } },
        { name: "lambda_services", symbol: "λ_srv", value: 0.78, min: 0.0, max: 1.0, step: 0.01, type: "loading", equation: "Measurement",
          description: { en: "Services sector loading on latent GDP factor.", ru: "Нагрузка сферы услуг на скрытый фактор.", uz: "Xizmatlar sektorining yashirin faktorga yuklamasi." } },
        { name: "phi_factor", symbol: "φ", value: 0.65, min: 0.0, max: 1.0, step: 0.01, type: "transition", equation: "State",
          description: { en: "AR(1) persistence of latent factor.", ru: "AR(1)-устойчивость скрытого фактора.", uz: "Yashirin faktor AR(1) barqarorligi." } },
        { name: "sigma_state", symbol: "σ_f", value: 0.45, min: 0.1, max: 2.0, step: 0.05, type: "kalman", equation: "State",
          description: { en: "State shock standard deviation.", ru: "Стандартное отклонение шока состояния.", uz: "Holat shoki standart og'ishi." } },
        { name: "n_indicators", symbol: "N", value: 34, min: 34, max: 34, step: 1, type: "metadata", equation: "Measurement",
          description: { en: "Number of monthly high-frequency indicators.", ru: "Количество ежемесячных высокочастотных индикаторов.", uz: "Oylik yuqori chastotali ko'rsatkichlar soni." } },
        { name: "forecast_horizon", symbol: "h", value: 3, min: 1, max: 6, step: 1, type: "simulation", equation: "—",
          description: { en: "Rolling forecast horizon (months).", ru: "Горизонт скользящего прогноза (месяцы).", uz: "Harakatlanuvchi prognoz gorizonti (oy)." } },
      ],
      equations: [
        { id: "state", name: "State Equation", formula: "f_t = φ·f_{t-1} + η_t, η_t ~ N(0, σ²_f)" },
        { id: "measurement", name: "Measurement Equation", formula: "x_{i,t} = λ_i·f_t + ε_{i,t}" },
        { id: "kalman_predict", name: "Kalman Prediction", formula: "f̂_{t|t-1} = φ·f̂_{t-1|t-1}" },
        { id: "kalman_update", name: "Kalman Update", formula: "f̂_{t|t} = f̂_{t|t-1} + K_t·(x_t − λ·f̂_{t|t-1})" },
      ],
      dataSources: [
        { institution: { en: "Statistics Agency of Uzbekistan", ru: "Агентство статистики", uz: "Statistika agentligi" }, description: { en: "34 monthly indicators: industrial output, retail trade, construction, transport, etc.", ru: "34 месячных индикатора: промышленность, розничная торговля, строительство, транспорт", uz: "34 oylik ko'rsatkich: sanoat, chakana savdo, qurilish, transport" }, url: "https://stat.uz/" },
        { institution: "CERR", description: { en: "Business activity and administrative indicators", ru: "Деловая активность и административные данные", uz: "Tadbirkorlik faolligi va ma'muriy ma'lumotlar" }, url: "https://cerr.uz/" },
      ],
      flowchart: [
        { from: "34 Raw Indicators", to: "Standardize & Transform" },
        { from: "Standardize & Transform", to: "Kalman Filter" },
        { from: "Kalman Filter", to: "Latent Factor Estimate" },
        { from: "Latent Factor Estimate", to: "GDP Nowcast + Fan Chart" },
      ],
    },

    /* ═══════════════════════════════════════════════════════════
       CGE — Computable General Equilibrium 1-2-3 Model
    ═══════════════════════════════════════════════════════════ */
    {
      id: "cge",
      name: { en: "CGE 1-2-3 Model", ru: "Модель CGE 1-2-3", uz: "CGE 1-2-3 modeli" },
      type: "Computable General Equilibrium",
      frequency: "Annual (base 2021)",
      status: "active",
      parameters: [
        /* CET Production Frontier */
        { name: "at", symbol: "a_t", value: 2.42, min: 1.0, max: 5.0, step: 0.01, type: "calibration", equation: "CET",
          description: { en: "CET transformation function scale parameter.", ru: "Масштабный параметр функции CET.", uz: "CET transformatsiya funksiyasi masshtab parametri." } },
        { name: "bt", symbol: "b_t", value: 0.82, min: 0.1, max: 0.99, step: 0.01, type: "calibration", equation: "CET",
          description: { en: "CET export share parameter.", ru: "Параметр доли экспорта CET.", uz: "CET eksport ulushi parametri." } },
        { name: "rho_t", symbol: "ρ_t", value: 2.43, min: 0.1, max: 5.0, step: 0.01, type: "calibration", equation: "CET",
          description: { en: "CET substitution exponent (ρ_t = 1/σ_t − 1).", ru: "Показатель замещения CET.", uz: "CET almashuv ko'rsatkichi." } },
        { name: "sig_t", symbol: "σ_t", value: 0.70, min: 0.2, max: 2.0, step: 0.05, type: "elasticity", equation: "CET",
          description: { en: "CET elasticity of transformation (export vs domestic).", ru: "Эластичность трансформации CET (экспорт vs внутренний).", uz: "CET transformatsiya elastikligi (eksport vs ichki)." } },
        /* CES Armington Absorption */
        { name: "aq", symbol: "a_q", value: 1.91, min: 1.0, max: 5.0, step: 0.01, type: "calibration", equation: "Armington",
          description: { en: "CES aggregation function scale parameter.", ru: "Масштабный параметр функции CES.", uz: "CES agregatsiya funksiyasi masshtab parametri." } },
        { name: "bq", symbol: "b_q", value: 0.32, min: 0.1, max: 0.99, step: 0.01, type: "calibration", equation: "Armington",
          description: { en: "CES import share parameter.", ru: "Параметр доли импорта CES.", uz: "CES import ulushi parametri." } },
        { name: "rho_q", symbol: "ρ_q", value: 0.43, min: 0.1, max: 5.0, step: 0.01, type: "calibration", equation: "Armington",
          description: { en: "CES substitution exponent (ρ_q = 1/σ_q − 1).", ru: "Показатель замещения CES.", uz: "CES almashuv ko'rsatkichi." } },
        { name: "sig_q", symbol: "σ_q", value: 0.70, min: 0.2, max: 3.0, step: 0.05, type: "elasticity", equation: "Armington",
          description: { en: "Armington elasticity of substitution (import vs domestic).", ru: "Эластичность замещения Армингтона.", uz: "Armington almashuv elastikligi." } },
        /* Policy Sliders */
        { name: "wm", symbol: "w_m", value: 0.98, min: -30, max: 30, step: 1, type: "policy", equation: "Import price",
          description: { en: "World import price index (base=0.98; slider shows % shock).", ru: "Индекс мировых цен на импорт (шок, %).", uz: "Jahon import narx indeksi (shok, %)." } },
        { name: "we", symbol: "w_e", value: 1.00, min: -30, max: 30, step: 1, type: "policy", equation: "Export price",
          description: { en: "World export price index (base=1.00; slider shows % shock).", ru: "Индекс мировых цен на экспорт (шок, %).", uz: "Jahon eksport narx indeksi (shok, %)." } },
        { name: "tm", symbol: "t_m", value: 0.02, min: 0, max: 0.30, step: 0.005, type: "policy", equation: "Import price",
          description: { en: "Import tariff rate (base 2%).", ru: "Ставка импортного тарифа (база 2%).", uz: "Import tarif stavkasi (baza 2%)." } },
        { name: "te", symbol: "t_e", value: 0.00, min: 0, max: 0.10, step: 0.005, type: "policy", equation: "Export price",
          description: { en: "Export duty rate (base 0%).", ru: "Ставка экспортной пошлины (база 0%).", uz: "Eksport boji stavkasi (baza 0%)." } },
        { name: "ts", symbol: "t_s", value: 0.06, min: 0, max: 0.20, step: 0.005, type: "policy", equation: "Tax revenue",
          description: { en: "Indirect (VAT) tax rate (base 6%).", ru: "Ставка НДС (база 6%).", uz: "QQS stavkasi (baza 6%)." } },
        { name: "ty", symbol: "t_y", value: 0.03, min: 0, max: 0.20, step: 0.005, type: "policy", equation: "Tax revenue",
          description: { en: "Direct (income) tax rate (base 3%).", ru: "Ставка подоходного налога (база 3%).", uz: "Daromad solig'i stavkasi (baza 3%)." } },
        { name: "sy", symbol: "s_y", value: 0.38, min: 0.20, max: 0.60, step: 0.005, type: "policy", equation: "Savings",
          description: { en: "Private savings rate out of disposable income (base 38%).", ru: "Норма частных сбережений (база 38%).", uz: "Xususiy jamg'arma stavkasi (baza 38%)." } },
        { name: "G_shock", symbol: "ΔG", value: 0, min: -40, max: 40, step: 1, type: "policy", equation: "Macro closure",
          description: { en: "Government consumption shock (% change).", ru: "Шок госрасходов (% изменение).", uz: "Davlat iste'mol xarajatlari shoki (% o'zgarish)." } },
        { name: "B_shock", symbol: "ΔB", value: 0, min: -80, max: 100, step: 5, type: "policy", equation: "BOP",
          description: { en: "Foreign savings/CA deficit shock (% change).", ru: "Шок иностранных сбережений (% изменение).", uz: "Xorijiy jamg'armalar shoki (% o'zgarish)." } },
        { name: "re_shock", symbol: "Δre", value: 0, min: -50, max: 100, step: 5, type: "policy", equation: "BOP",
          description: { en: "Remittances shock (% change).", ru: "Шок денежных переводов (% изменение).", uz: "Pul o'tkazmalari shoki (% o'zgarish)." } },
        /* Base year endogenous (2021 calibration) */
        { name: "E_base", symbol: "E", value: 0.26, min: 0, max: 1, step: 0.01, type: "base_year", equation: "CET",
          description: { en: "Exports (base year 2021).", ru: "Экспорт (базовый 2021).", uz: "Eksport (bazaviy 2021)." } },
        { name: "M_base", symbol: "M", value: 0.44, min: 0, max: 1, step: 0.01, type: "base_year", equation: "Armington",
          description: { en: "Imports (base year 2021).", ru: "Импорт (базовый 2021).", uz: "Import (bazaviy 2021)." } },
        { name: "Ds_base", symbol: "Ds", value: 0.74, min: 0, max: 2, step: 0.01, type: "base_year", equation: "CET",
          description: { en: "Domestic supply (base year).", ru: "Внутреннее предложение (базовый).", uz: "Ichki taklif (bazaviy)." } },
        { name: "Q_base", symbol: "Q", value: 1.18, min: 0, max: 2, step: 0.01, type: "base_year", equation: "Armington",
          description: { en: "Composite good absorption (base year).", ru: "Композитный товар (базовый).", uz: "Kompozit tovar (bazaviy)." } },
        { name: "Y_base", symbol: "Y", value: 1.10, min: 0, max: 2, step: 0.01, type: "base_year", equation: "Income",
          description: { en: "GDP / national income (base year).", ru: "ВВП / национальный доход (базовый).", uz: "YaIM / milliy daromad (bazaviy)." } },
        { name: "Cn_base", symbol: "Cn", value: 0.61, min: 0, max: 2, step: 0.01, type: "base_year", equation: "Demand",
          description: { en: "Private consumption (base year).", ru: "Частное потребление (базовый).", uz: "Xususiy iste'mol (bazaviy)." } },
        { name: "TAX_base", symbol: "TAX", value: 0.12, min: 0, max: 1, step: 0.01, type: "base_year", equation: "Fiscal",
          description: { en: "Total tax revenue (base year).", ru: "Налоговые поступления (базовый).", uz: "Soliq tushumlari (bazaviy)." } },
        { name: "Z_base", symbol: "Z", value: 0.36, min: 0, max: 1, step: 0.01, type: "base_year", equation: "S=I",
          description: { en: "Investment = total savings (base year).", ru: "Инвестиции = сбережения (базовый).", uz: "Investitsiyalar = jamg'armalar (bazaviy)." } },
      ],
      equations: [
        { id: "price_e", name: "Export Price", formula: "Pe = we·(1−te)·Er" },
        { id: "price_m", name: "Import Price", formula: "Pm = wm·(1+tm)·Er" },
        { id: "cet_foc", name: "CET First-Order", formula: "E/Ds = [(1−bt)/bt · Pe/Pd]^σ_t" },
        { id: "armington_foc", name: "Armington FOC", formula: "M/Dd = [bq/(1−bq) · Pd/Pm]^σ_q" },
        { id: "bop", name: "BOP Closure", formula: "Pm·M − Pe·E − B − re − ft = 0 (bisection on Er)" },
        { id: "income", name: "National Income", formula: "Y = Px·X + tr + ft + re" },
        { id: "consumption", name: "Consumption", formula: "Cn = (1−sy)·(Y − TAX)" },
        { id: "investment", name: "Investment", formula: "Z = sy·(Y−TAX) + Sg + B" },
      ],
      dataSources: [
        { institution: "World Bank WDI", description: { en: "Trade, GDP, sector aggregates for SAM calibration", ru: "Торговля, ВВП, секторальные агрегаты для калибровки SAM", uz: "SAM kalibratsiyasi uchun savdo, YaIM, tarmoq agregatlari" }, url: "https://data.worldbank.org/" },
        { institution: { en: "Statistics Agency of Uzbekistan", ru: "Агентство статистики", uz: "Statistika agentligi" }, description: { en: "National accounts, trade balance, fiscal data", ru: "Национальные счета, торговый баланс, фискальные данные", uz: "Milliy hisoblar, savdo balansi, fiskal ma'lumotlar" }, url: "https://stat.uz/" },
        { institution: "CERR", description: { en: "Base year SAM construction and parameter estimation", ru: "Построение SAM базового года и оценка параметров", uz: "Bazaviy yil SAM qurilishi va parametrlar baholash" }, url: "https://cerr.uz/" },
      ],
      flowchart: [
        { from: "Policy Shock (tariff/price/fiscal)", to: "Relative Prices (Pe, Pm, Er)" },
        { from: "Relative Prices", to: "CET: Export vs Domestic Split" },
        { from: "Relative Prices", to: "Armington: Import vs Domestic Mix" },
        { from: "CET + Armington", to: "Trade Balance & BOP Closure" },
        { from: "Trade Balance", to: "Welfare, Output, Consumption" },
      ],
    },

    /* ═══════════════════════════════════════════════════════════
       IO — Input-Output Model (Leontief)
    ═══════════════════════════════════════════════════════════ */
    {
      id: "io",
      name: { en: "Input-Output Model", ru: "Межотраслевой баланс", uz: "Tarmoqlararo balans modeli" },
      type: "Leontief I-O",
      frequency: "Annual (base 2022)",
      status: "active",
      parameters: [
        { name: "sectors", symbol: "n", value: 136, min: 136, max: 136, step: 1, type: "metadata", equation: "Structure",
          description: { en: "Number of production sectors in the symmetric IO table.", ru: "Количество секторов в симметричной таблице МОБ.", uz: "Simmetrik MOB jadvalidagi tarmoqlar soni." } },
        { name: "base_year", symbol: "t₀", value: 2022, min: 2022, max: 2022, step: 1, type: "metadata", equation: "Structure",
          description: { en: "Base year of IO table calibration.", ru: "Базовый год калибровки таблицы МОБ.", uz: "MOB jadvali kalibratsiyasining bazaviy yili." } },
        { name: "type_output", symbol: "m_out", value: 1, min: 0, max: 1, step: 1, type: "multiplier", equation: "Leontief inverse",
          description: { en: "Output multipliers (column sums of Leontief inverse).", ru: "Мультипликаторы выпуска (суммы столбцов обратной матрицы Леонтьева).", uz: "Ishlab chiqarish multiplikatorlari (Leontev teskari matritsasi ustun yig'indilari)." } },
        { name: "type_va", symbol: "m_va", value: 1, min: 0, max: 1, step: 1, type: "multiplier", equation: "Leontief inverse",
          description: { en: "Value-added multipliers per unit final demand.", ru: "Мультипликаторы добавленной стоимости на единицу конечного спроса.", uz: "Oxirgi talab birligiga qo'shilgan qiymat multiplikatorlari." } },
        { name: "type_emp", symbol: "m_emp", value: 1, min: 0, max: 1, step: 1, type: "multiplier", equation: "Leontief inverse",
          description: { en: "Employment multipliers (persons per bln UZS final demand).", ru: "Мультипликаторы занятости (чел. на млрд UZS).", uz: "Bandlik multiplikatorlari (kishi / mlrd UZS)." } },
      ],
      equations: [
        { id: "leontief", name: "Leontief Inverse", formula: "x = (I − A)⁻¹ · f" },
        { id: "backward", name: "Backward Linkage", formula: "BL_j = (Σ_i L_{ij}) / (Σ L / n)" },
        { id: "forward", name: "Forward Linkage", formula: "FL_i = (Σ_j L_{ij}) / (Σ L / n)" },
        { id: "price_model", name: "Cost-Push Price Model", formula: "p = (I − A')⁻¹ · v" },
      ],
      dataSources: [
        { institution: { en: "Statistics Agency of Uzbekistan", ru: "Агентство статистики", uz: "Statistika agentligi" }, description: { en: "Symmetric input-output table 2022 (136 × 136 sectors)", ru: "Симметричная таблица МОБ 2022 (136 × 136 секторов)", uz: "Simmetrik MOB jadvali 2022 (136 × 136 tarmoq)" }, url: "https://stat.uz/" },
      ],
      flowchart: [
        { from: "Demand Shock (ΔC, ΔG, ΔI, ΔX)", to: "Leontief Inverse (I−A)⁻¹" },
        { from: "Leontief Inverse", to: "Gross Output by Sector" },
        { from: "Gross Output", to: "VA & Employment Multipliers" },
        { from: "VA & Employment", to: "Backward/Forward Linkage Classification" },
      ],
    },

    /* ═══════════════════════════════════════════════════════════
       PE — Partial Equilibrium (WITS-SMART)
    ═══════════════════════════════════════════════════════════ */
    {
      id: "pe",
      name: { en: "Partial Equilibrium Model", ru: "Модель частичного равновесия", uz: "Qisman muvozanat modeli" },
      type: "WITS-SMART",
      frequency: "Annual (HS-10 level)",
      status: "active",
      parameters: [
        { name: "import_demand_elasticity", symbol: "ε_d", value: 1.27, min: 0.1, max: 5.0, step: 0.01, type: "elasticity", equation: "Trade creation",
          description: { en: "Import demand elasticity (WITS global database default).", ru: "Эластичность импортного спроса (по умолчанию WITS).", uz: "Import talab elastikligi (WITS global bazasi)." } },
        { name: "substitution_elasticity", symbol: "ε_s", value: 1.50, min: 0.1, max: 5.0, step: 0.01, type: "elasticity", equation: "Trade diversion",
          description: { en: "Substitution elasticity between import sources.", ru: "Эластичность замещения между источниками импорта.", uz: "Import manbalari o'rtasida almashuv elastikligi." } },
        { name: "tariff_cut", symbol: "Δt", value: 0.20, min: 0.05, max: 1.00, step: 0.05, type: "policy", equation: "Scenario",
          description: { en: "Tariff cut rate for WTO accession scenario (5%–100%).", ru: "Ставка снижения тарифа для сценария вступления в ВТО.", uz: "VSTga qo'shilish stsenariysi uchun tarif kamaytirish stavkasi." } },
      ],
      equations: [
        { id: "tc", name: "Trade Creation", formula: "TC_{ij} = M_{ij} · ε_d · |Δt / (1 + t)|" },
        { id: "td", name: "Trade Diversion", formula: "TD_{ij} = M_{ij}^{FTA} · ε_s · |Δt / (1 + t)|" },
        { id: "welfare_cs", name: "Consumer Surplus", formula: "ΔCS = ½ · ΔM · Δt" },
        { id: "revenue", name: "Revenue Change", formula: "ΔR = t_new·M_new − t_old·M_old" },
      ],
      dataSources: [
        { institution: "WITS / COMTRADE", description: { en: "HS-10 level bilateral imports and applied tariffs", ru: "Двусторонний импорт и тарифы на уровне HS-10", uz: "HS-10 darajasida ikki tomonlama import va tariflar" }, url: "https://wits.worldbank.org/" },
        { institution: { en: "Uzbekistan State Customs Committee", ru: "Государственный таможенный комитет", uz: "Davlat bojxona qo'mitasi" }, description: { en: "Applied MFN tariff schedule and customs data", ru: "Применяемый тарифный график РНБ и таможенные данные", uz: "Qo'llaniladigan EIM tarif jadvali va bojxona ma'lumotlari" }, url: "" },
      ],
      flowchart: [
        { from: "Tariff Cut Scenario", to: "Trade Creation (ΔM)" },
        { from: "Tariff Cut Scenario", to: "Trade Diversion (shift sources)" },
        { from: "Trade Creation + Diversion", to: "Welfare Analysis (CS, Revenue)" },
        { from: "Welfare Analysis", to: "Sector & Partner Impact Tables" },
      ],
    },

    /* ═══════════════════════════════════════════════════════════
       FPP — Financial Programming & Policies
    ═══════════════════════════════════════════════════════════ */
    {
      id: "fpp",
      name: { en: "Financial Programming & Policies", ru: "Финансовое программирование и политика", uz: "Moliyaviy dasturlash va siyosat" },
      type: "IMF CAEM Framework",
      frequency: "Annual (3-year projection)",
      status: "active",
      parameters: [
        /* Phillips Curve Coefficients */
        { name: "lambda1", symbol: "λ₁", value: 0.05, min: 0.0, max: 1.0, step: 0.01, type: "coefficient", equation: "Phillips",
          description: { en: "Lagged inflation weight in open-economy Phillips Curve.", ru: "Вес лагированной инфляции в кривой Филлипса.", uz: "Fillips egri chizig'ida ortda qolgan inflyatsiya vazni." } },
        { name: "lambda2", symbol: "λ₂", value: 0.70, min: 0.0, max: 1.0, step: 0.01, type: "coefficient", equation: "Phillips",
          description: { en: "Imported inflation share — dominance of import prices (70%).", ru: "Доля импортированной инфляции — доминирование импортных цен (70%).", uz: "Import qilingan inflyatsiya ulushi — import narxlari ustunligi (70%)." } },
        { name: "lambda3", symbol: "λ₃", value: 0.40, min: 0.0, max: 1.0, step: 0.01, type: "coefficient", equation: "Phillips",
          description: { en: "Output gap pass-through to inflation.", ru: "Передача разрыва выпуска в инфляцию.", uz: "Ishlab chiqarish tafovutining inflyatsiyaga o'tishi." } },
        { name: "omega", symbol: "ω", value: 0.50, min: 0.0, max: 1.0, step: 0.01, type: "coefficient", equation: "Expectations",
          description: { en: "Inflation expectation weight (adaptive vs forward-looking).", ru: "Вес инфляционных ожиданий (адаптивные vs перспективные).", uz: "Inflyatsion kutishlar vazni (moslashuvchan vs istiqbolli)." } },
        { name: "G_POT", symbol: "g*", value: 5.8, min: 3.0, max: 8.0, step: 0.1, type: "calibration", equation: "Real sector",
          description: { en: "Potential GDP growth rate (%).", ru: "Потенциальный рост ВВП (%).", uz: "Potensial YaIM o'sish sur'ati (%)." } },
        { name: "IMPORT_SHARE", symbol: "m/Y", value: 0.355, min: 0.1, max: 0.6, step: 0.005, type: "calibration", equation: "Phillips",
          description: { en: "Imports as share of GDP (35.5%).", ru: "Импорт как доля ВВП (35,5%).", uz: "YaIMdagi import ulushi (35,5%)." } },
        { name: "pi_target", symbol: "π*", value: 5.0, min: 3.0, max: 10.0, step: 0.5, type: "calibration", equation: "Phillips",
          description: { en: "CBU medium-term inflation target (%).", ru: "Среднесрочная цель ЦБ по инфляции (%).", uz: "MB o'rta muddatli inflyatsiya maqsadi (%)." } },
        /* Base Year Constants (2024) */
        { name: "BASE_NGDP", symbol: "NGDP₀", value: 1454574, min: 0, max: 9999999, step: 1, type: "base_year", equation: "Real sector",
          description: { en: "Nominal GDP 2024 (bln UZS).", ru: "Номинальный ВВП 2024 (млрд сум).", uz: "Nominal YaIM 2024 (mlrd so'm)." } },
        { name: "BASE_NER", symbol: "NER₀", value: 12652.7, min: 0, max: 99999, step: 0.1, type: "base_year", equation: "External",
          description: { en: "Exchange rate UZS/USD (2024).", ru: "Обменный курс UZS/USD (2024).", uz: "Valyuta kursi UZS/USD (2024)." } },
        { name: "BASE_reserves", symbol: "R₀", value: 41182, min: 0, max: 999999, step: 1, type: "base_year", equation: "External",
          description: { en: "International reserves (mln USD, 2024).", ru: "Международные резервы (млн долл., 2024).", uz: "Xalqaro zaxiralar (mln AQSh dollari, 2024)." } },
        { name: "BASE_M2", symbol: "M2₀", value: 277065, min: 0, max: 9999999, step: 1, type: "base_year", equation: "Monetary",
          description: { en: "Broad money M2 (bln UZS, 2024).", ru: "Денежная масса M2 (млрд сум, 2024).", uz: "Keng pul massasi M2 (mlrd so'm, 2024)." } },
        { name: "BASE_velocity", symbol: "V₀", value: 5.95, min: 1.0, max: 15.0, step: 0.01, type: "base_year", equation: "Monetary",
          description: { en: "Money velocity (NGDP/M2).", ru: "Скорость обращения денег (НВВП/M2).", uz: "Pul aylanish tezligi (NYAIM/M2)." } },
        { name: "BASE_debt_GDP", symbol: "d₀", value: 32.6, min: 0, max: 100, step: 0.1, type: "base_year", equation: "Fiscal",
          description: { en: "Government debt (% GDP, 2024).", ru: "Государственный долг (% ВВП, 2024).", uz: "Davlat qarzi (% YaIM, 2024)." } },
        { name: "BASE_ext_debt_GDP", symbol: "d*₀", value: 57.2, min: 0, max: 200, step: 0.1, type: "base_year", equation: "External",
          description: { en: "External debt (% GDP, 2024).", ru: "Внешний долг (% ВВП, 2024).", uz: "Tashqi qarz (% YaIM, 2024)." } },
        { name: "BASE_policy_rate", symbol: "i₀", value: 13.5, min: 0, max: 30, step: 0.25, type: "base_year", equation: "Monetary",
          description: { en: "CBU policy rate (%, 2024).", ru: "Ставка ЦБ (%, 2024).", uz: "MB stavkasi (%, 2024)." } },
      ],
      equations: [
        { id: "fpp_phillips", name: "Open-Economy Phillips Curve", formula: "π = λ₂·π_imp + (1−λ₁−λ₂)·π_exp + λ₁·π_{t-1} + λ₃·y_gap" },
        { id: "fpp_uip", name: "UIP / Exchange Rate", formula: "Δe = (i − i*) − ρ + κ·(E[e] − e)" },
        { id: "fpp_money", name: "Monetary Identity", formula: "M2 = NGDP / V; ΔM2 = ΔNFA + ΔNDA" },
        { id: "fpp_bop", name: "BOP Identity", formula: "CA + KA + FA + E&O = ΔReserves" },
        { id: "fpp_fiscal", name: "Fiscal Balance", formula: "FB = Revenue − Expenditure; Δd = FB + (r−g)·d_{t-1}" },
        { id: "fpp_real", name: "Real Sector", formula: "NGDP = RGDP · (1 + π); y_gap = g − g*" },
      ],
      dataSources: [
        { institution: "IMF CAEM", description: { en: "Financial Programming framework and calibration workbook (Sep 2025)", ru: "Рабочая книга калибровки CAEM (сент. 2025)", uz: "CAEM kalibratsiya ish kitobi (2025 sent.)" }, url: "https://www.imf.org/" },
        { institution: { en: "Ministry of Finance", ru: "Министерство финансов", uz: "Moliya vazirligi" }, description: { en: "Revenue, expenditure, public debt data", ru: "Доходы, расходы, государственный долг", uz: "Daromadlar, xarajatlar, davlat qarzi" }, url: "https://mf.uz/" },
        { institution: "Central Bank of Uzbekistan", description: { en: "Monetary aggregates, NFA, policy rate, reserves", ru: "Денежные агрегаты, ЧИА, ставка, резервы", uz: "Pul agregatlari, STF, stavka, zaxiralar" }, url: "https://cbu.uz/" },
      ],
      flowchart: [
        { from: "Policy Assumptions (growth, NER, rates)", to: "Real Sector (GDP, inflation)" },
        { from: "Real Sector", to: "External Sector (CA, BOP, reserves)" },
        { from: "External + Fiscal Assumptions", to: "Fiscal Sector (revenue, expenditure, debt)" },
        { from: "Fiscal + External", to: "Monetary Sector (M2, NFA, NDA)" },
        { from: "All 4 Sectors", to: "Consistency Matrix Checks" },
      ],
    },
  ],
};
