window.MODEL_REGISTRY = {
  meta: {
    version: "0.1.0",
    lastUpdated: "2026-04-16",
  },
  models: [
    {
      id: "qpm",
      name: { en: "Quarterly Projection Model", ru: "Квартальная прогнозная модель", uz: "Choraklik prognoz modeli" },
      type: "New-Keynesian DSGE",
      status: "active",
      parameters: [
        { name: "b1", symbol: "b1", value: 0.70, range: "0.0–1.0", type: "behavioral", equation: "IS", description: { en: "Output-gap persistence.", ru: "Инерция разрыва выпуска.", uz: "Ishlab chiqarish tafovuti inertsiyasi." } },
        { name: "b2", symbol: "b2", value: 0.20, range: "0.0–1.0", type: "behavioral", equation: "IS", description: { en: "Real-rate sensitivity.", ru: "Чувствительность к реальной ставке.", uz: "Haqiqiy stavkaga sezgirlik." } },
        { name: "a1", symbol: "a1", value: 0.55, range: "0.0–1.0", type: "behavioral", equation: "Phillips", description: { en: "Inflation inertia.", ru: "Инерция инфляции.", uz: "Inflyatsiya inertsiyasi." } },
        { name: "g1", symbol: "g1", value: 1.50, range: "0.0–3.0", type: "policy", equation: "Taylor", description: { en: "Policy response to inflation gap.", ru: "Реакция ставки на инфляционный разрыв.", uz: "Stavkaning inflyatsion tafovutga javobi." } },
        { name: "rrbar", symbol: "rr̄", value: 3.0, range: "1.0–6.0", type: "steady_state", equation: "Taylor", description: { en: "Neutral real rate.", ru: "Нейтральная реальная ставка.", uz: "Neytral haqiqiy stavka." } },
      ],
      equations: [
        { id: "is", name: "IS Curve", formula: "y_gap(t)=b1*y_gap(t-1)-b2*rr_gap(t)+e_y(t)" },
        { id: "phillips", name: "Phillips Curve", formula: "pi(t)=a1*pi(t-1)+(1-a1)*E[pi(t+1)]+a3*y_gap(t)+e_pi(t)" },
        { id: "taylor", name: "Taylor Rule", formula: "i(t)=g1*(pi(t)-pi*)+g2*y_gap(t)+rrbar+e_i(t)" },
        { id: "uip", name: "UIP", formula: "q(t)=E[q(t+1)]-(i(t)-i*(t))+e_q(t)" },
      ],
      dataSources: [
        { institution: "Central Bank of Uzbekistan", description: "Policy rate, CPI, exchange rate", url: "https://cbu.uz/" },
        { institution: "Statistics Agency", description: "National accounts and deflators", url: "https://stat.uz/" },
      ],
      flowchart: ["Shocks", "IS block", "Phillips block", "Taylor block", "Output & inflation"],
    },
    {
      id: "dfm",
      name: { en: "GDP Nowcasting DFM", ru: "DFM-прогноз ВВП", uz: "YaIM DFM prognozi" },
      type: "Dynamic Factor Model",
      status: "active",
      parameters: [
        { name: "lambda_industry", symbol: "λ_ind", value: 0.84, range: "0.0–1.0", type: "loading", equation: "Measurement", description: { en: "Industry loading on latent factor.", ru: "Нагрузка промышленности на скрытый фактор.", uz: "Sanoatning yashirin faktorga yuklamasi." } },
        { name: "lambda_services", symbol: "λ_srv", value: 0.78, range: "0.0–1.0", type: "loading", equation: "Measurement", description: { en: "Services loading on latent factor.", ru: "Нагрузка услуг на скрытый фактор.", uz: "Xizmatlar faktorga yuklamasi." } },
        { name: "phi_factor", symbol: "φ", value: 0.65, range: "0.0–1.0", type: "transition", equation: "State", description: { en: "AR persistence of latent factor.", ru: "AR-устойчивость скрытого фактора.", uz: "Yashirin faktor AR barqarorligi." } },
        { name: "sigma_state", symbol: "σ_f", value: 0.45, range: "0.1–2.0", type: "kalman", equation: "State", description: { en: "State shock standard deviation.", ru: "СКО шока состояния.", uz: "Holat shoki standart og'ishi." } },
      ],
      equations: [
        { id: "state", name: "State Equation", formula: "f_t=phi*f_(t-1)+eta_t" },
        { id: "measurement", name: "Measurement", formula: "x_(i,t)=lambda_i*f_t+eps_(i,t)" },
      ],
      dataSources: [
        { institution: "Statistics Agency", description: "Monthly/quarterly high-frequency indicators", url: "https://stat.uz/" },
        { institution: "CERR", description: "Business activity and administrative indicators", url: "https://cerr.uz/" },
      ],
      flowchart: ["Raw indicators", "Standardize", "Kalman filter", "Factor estimate", "GDP nowcast"],
    },
    {
      id: "cge",
      name: { en: "CGE 1-2-3 Model", ru: "CGE модель 1-2-3", uz: "CGE 1-2-3 modeli" },
      type: "Computable General Equilibrium",
      status: "active",
      parameters: [
        { name: "sig_t", symbol: "σ_t", value: 0.70, range: "0.2–2.0", type: "elasticity", equation: "CET", description: { en: "Transformation elasticity between exports and domestic sales.", ru: "Эластичность трансформации между экспортом и внутренним рынком.", uz: "Eksport va ichki bozor o'rtasidagi transformatsiya elastikligi." } },
        { name: "sig_m", symbol: "σ_m", value: 1.20, range: "0.2–3.0", type: "elasticity", equation: "Armington", description: { en: "Substitution between imports and domestic goods.", ru: "Замещение импорта и внутренней продукции.", uz: "Import va ichki mahsulot o'rtasida almashuvchanlik." } },
        { name: "tau_import", symbol: "τ_m", value: 0.10, range: "0.0–0.5", type: "policy", equation: "Import price", description: { en: "Import tariff wedge.", ru: "Тарифный клин на импорт.", uz: "Import tarif klini." } },
        { name: "gov_spend_shock", symbol: "ΔG", value: 0.0, range: "-0.2–0.2", type: "policy", equation: "Macro closure", description: { en: "Government spending shock.", ru: "Шок госрасходов.", uz: "Davlat xarajatlari shoki." } },
      ],
      equations: [
        { id: "cet", name: "CET Supply", formula: "Q=F(E,D;σ_t)" },
        { id: "armington", name: "Armington Demand", formula: "Qd=F(M,D;σ_m)" },
        { id: "closure", name: "Macro Closure", formula: "Savings = Investment; BOP clears via real exchange rate" },
      ],
      dataSources: [
        { institution: "SAM 2021", description: "Social accounting matrix calibration", url: "https://www.worldbank.org/" },
        { institution: "Statistics Agency", description: "Trade and sector aggregates", url: "https://stat.uz/" },
      ],
      flowchart: ["Policy shock", "Relative prices", "Sectoral reallocation", "Trade balance", "Welfare/output"],
    },
    {
      id: "io",
      name: { en: "Input-Output Model", ru: "Межотраслевой баланс", uz: "Tarmoqlararo balans" },
      type: "Leontief I-O",
      status: "active",
      parameters: [
        { name: "sectors", symbol: "n", value: 136, range: "136", type: "metadata", equation: "Structure", description: { en: "Number of production sectors.", ru: "Количество производственных секторов.", uz: "Ishlab chiqarish tarmoqlari soni." } },
        { name: "type_output", symbol: "m_out", value: "enabled", range: "on/off", type: "multiplier", equation: "Leontief inverse", description: { en: "Output multipliers.", ru: "Мультипликаторы выпуска.", uz: "Ishlab chiqarish multiplikatorlari." } },
        { name: "type_va", symbol: "m_va", value: "enabled", range: "on/off", type: "multiplier", equation: "Leontief inverse", description: { en: "Value-added multipliers.", ru: "Мультипликаторы добавленной стоимости.", uz: "Qo'shilgan qiymat multiplikatorlari." } },
        { name: "type_emp", symbol: "m_emp", value: "enabled", range: "on/off", type: "multiplier", equation: "Leontief inverse", description: { en: "Employment multipliers.", ru: "Мультипликаторы занятости.", uz: "Bandlik multiplikatorlari." } },
      ],
      equations: [
        { id: "leontief", name: "Leontief Inverse", formula: "x=(I-A)^(-1)*f" },
      ],
      dataSources: [
        { institution: "Statistics Agency", description: "Input-output table 2022", url: "https://stat.uz/" },
      ],
      flowchart: ["Demand shock", "Leontief inverse", "Gross output", "VA and jobs multipliers"],
    },
    {
      id: "pe",
      name: { en: "Partial Equilibrium Model", ru: "Модель частичного равновесия", uz: "Qisman muvozanat modeli" },
      type: "WITS-SMART",
      status: "active",
      parameters: [
        { name: "import_demand_elasticity", symbol: "ε", value: 1.27, range: "0.1–5.0", type: "elasticity", equation: "Trade creation", description: { en: "Import demand elasticity.", ru: "Эластичность импортного спроса.", uz: "Import talab elastikligi." } },
        { name: "substitution_elasticity", symbol: "σ", value: 1.50, range: "0.1–5.0", type: "elasticity", equation: "Trade diversion", description: { en: "Substitution between partner sources.", ru: "Замещение между источниками импорта.", uz: "Hamkorlar bo'yicha import manbalari almashuvchanligi." } },
        { name: "tariff_cut", symbol: "Δt", value: 0.20, range: "0.0–1.0", type: "policy", equation: "Scenario", description: { en: "Scenario tariff cut.", ru: "Снижение тарифа по сценарию.", uz: "Ssenariydagi tarif kamayishi." } },
      ],
      equations: [
        { id: "tc", name: "Trade Creation", formula: "TC=M*ε*(t_new-t_old)/(1+t_old)" },
        { id: "td", name: "Trade Diversion", formula: "TD=TC*σ/(1+σ)" },
      ],
      dataSources: [
        { institution: "WITS / COMTRADE", description: "HS-level bilateral imports and tariffs", url: "https://wits.worldbank.org/" },
      ],
      flowchart: ["Tariff scenario", "Trade creation/diversion", "Welfare", "Revenue"],
    },
    {
      id: "fpp",
      name: { en: "Financial Programming & Policies", ru: "Финансовое программирование и политика", uz: "Moliyaviy dasturlash va siyosat" },
      type: "IMF CAEM",
      status: "active",
      parameters: [
        { name: "lambda1", symbol: "λ1", value: 0.05, range: "0.0–1.0", type: "coefficient", equation: "Phillips", description: { en: "Inflation inertia.", ru: "Инерция инфляции.", uz: "Inflyatsiya inertsiyasi." } },
        { name: "lambda2", symbol: "λ2", value: 0.70, range: "0.0–1.0", type: "coefficient", equation: "Phillips", description: { en: "Imported inflation share.", ru: "Доля импортируемой инфляции.", uz: "Import qilinadigan inflyatsiya ulushi." } },
        { name: "lambda3", symbol: "λ3", value: 0.40, range: "0.0–1.0", type: "coefficient", equation: "Phillips", description: { en: "Output-gap pass-through.", ru: "Передача разрыва выпуска.", uz: "Ishlab chiqarish tafovuti uzatmasi." } },
        { name: "omega", symbol: "ω", value: 0.60, range: "0.0–1.0", type: "coefficient", equation: "Money demand", description: { en: "Money demand elasticity.", ru: "Эластичность спроса на деньги.", uz: "Pul talab elastikligi." } },
      ],
      equations: [
        { id: "fpp_phillips", name: "Open-Economy Phillips", formula: "pi=λ2*pi_imp+(1-λ1-λ2)*pi_exp+λ1*pi(-1)+λ3*y_gap" },
        { id: "fpp_money", name: "Monetary Identity", formula: "NFA+NDA=M2" },
        { id: "fpp_bop", name: "BOP Identity", formula: "CA+KA+FA+Errors=ΔReserves" },
      ],
      dataSources: [
        { institution: "IMF CAEM", description: "Framework calibration and consistency matrix", url: "https://www.imf.org/" },
        { institution: "Ministry of Finance", description: "Fiscal and debt data", url: "https://mf.uz/" },
      ],
      flowchart: ["Assumptions", "Real/External/Fiscal/Monetary blocks", "Consistency checks", "Policy envelope"],
    },
  ],
};
