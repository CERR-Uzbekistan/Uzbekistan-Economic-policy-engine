# export_qpm.R — nightly QPM calibration + baseline IRF export
#
# Produces: apps/policy-ui/public/data/qpm.json
# Source of solver logic: qpm_uzbekistan/index.html (ported to R)
# Run: Rscript scripts/export_qpm.R
#
# This script is intended to run in CI (.github/workflows/data-regen.yml,
# to be added separately) nightly. It is also safely runnable locally for
# development.

suppressPackageStartupMessages({
  library(jsonlite)
})

# ============================================================
#  CALIBRATION — verbatim from qpm_uzbekistan/index.html
#  (default slider values in the "Uzbekistan Calibration")
# ============================================================

CALIBRATION <- list(
  # IS curve
  b1 = 0.70, b2 = 0.20, b3 = 0.30, b4 = 0.60,
  # Phillips curve
  a1 = 0.60, a2 = 0.20, a3 = 0.65, a4 = 0.12,
  # Taylor rule
  g1 = 0.80, g2 = 1.50, g3 = 0.50,
  # UIP
  e1 = 0.70,
  # Steady state (percent)
  tar = 5.0, rrbar = 3.5, gdpbar = 6.0
)

# Baseline initial conditions used on the Baseline page of the legacy UI.
# These are LEVEL values (percent); converted to deviation form by the solver
# using the steady-state constants (tar, rrbar+tar).
BASELINE_INIT_LEVELS <- list(
  pi   = 10.5,  # Inflation YoY %
  rs   = 13.5,  # Policy rate %
  gap  = -1.5,  # Output gap %
  d4ls = 8.0    # NER depreciation YoY %
)

# Starting exchange rate level (UZS/USD) for 2026 Q1.
# Used to convert YoY log depreciation (d4l_s) to a displayable level path.
EXCHANGE_RATE_BASE_UZS_PER_USD <- 12650

SOLVER_VERSION <- "0.1.0"
DATA_VERSION   <- "2026Q1"

# ============================================================
#  PARAMETER DESCRIPTORS
#  Trilingual descriptions extracted verbatim from
#  qpm_uzbekistan/index.html data-tip / data-tip-ru / data-tip-uz
#  attributes. If a translation is absent, `null` is emitted.
# ============================================================

build_parameters <- function(calib = CALIBRATION) {
  # Each entry: symbol, label, value, range_min, range_max,
  #             description_en, description_ru, description_uz
  list(
    list(
      symbol       = "b1",
      label        = "Gap persistence",
      value        = calib$b1,
      range_min    = 0.30,
      range_max    = 0.95,
      description  = "Inertia in output gap dynamics. Controls how quickly the GDP gap closes; higher b1 means more inertia and slower recovery from shocks.",
      description_ru = "Инерция в динамике разрыва выпуска. Контролирует скорость закрытия разрыва ВВП: высокий b1 = больше инерции, медленнее восстановление после шоков.",
      description_uz = "Chiqarish bo'shlig'i dinamikasidagi inersiya. YaIM bo'shlig'i qanchalik tez yopilishini boshqaradi: yuqori b1 = ko'proq inersiya, sekinroq tiklanish."
    ),
    list(
      symbol       = "b2",
      label        = "MCI sensitivity",
      value        = calib$b2,
      range_min    = 0.05,
      range_max    = 0.60,
      description  = "Monetary policy transmission to demand. How strongly monetary conditions (interest rate plus exchange rate) affect the output gap; key monetary transmission parameter.",
      description_ru = "Трансмиссия денежной политики на спрос. Насколько денежные условия (ставка + курс) влияют на разрыв выпуска; ключевой параметр денежной трансмиссии.",
      description_uz = "Pul-kredit siyosatining talabga transmissiyasi. Pul-kredit shartlari (foiz stavkasi + valyuta kursi) chiqarish bo'shlig'iga ta'sir kuchi; asosiy monetar transmissiya parametri."
    ),
    list(
      symbol       = "b3",
      label        = "External demand",
      value        = calib$b3,
      range_min    = 0.05,
      range_max    = 0.60,
      description  = "Foreign output gap spillover. Sensitivity of domestic output to foreign economic cycles; important for Uzbekistan as an open economy with significant trade and remittances.",
      description_ru = "Перелив внешнего разрыва выпуска. Чувствительность внутреннего выпуска к внешним экономическим циклам; важно для открытой экономики Узбекистана с торговлей и денежными переводами.",
      description_uz = "Tashqi chiqarish bo'shlig'i ta'siri. Ichki chiqarishning tashqi iqtisodiy tsikllarga sezgirligi; savdo va pul o'tkazmalari bo'lgan ochiq iqtisodiyot uchun muhim."
    ),
    list(
      symbol       = "g2",
      label        = "Taylor inflation response",
      value        = calib$g2,
      range_min    = 1.0,
      range_max    = 3.0,
      description  = "Taylor Principle: must exceed 1 for inflation stability. g2 = 1.5 means the CBU raises the nominal rate by 150 bp for every 1 pp inflation overshoot, ensuring the real rate rises to cool demand.",
      description_ru = "Принцип Тейлора: должен превышать 1 для стабильности инфляции. g2 = 1.5: ЦБУ повышает ставку на 150 б.п. при каждом 1 п.п. превышения инфляции.",
      description_uz = "Teylor printsipi: inflyatsiya barqarorligi uchun 1 dan katta bo'lishi shart. g2 = 1.5: har 1 p.p. inflyatsiya ortiqchaligida CBU stavkani 150 b.p. ko'taradi."
    ),
    list(
      symbol       = "e1",
      label        = "UIP backward weight",
      value        = calib$e1,
      range_min    = 0.1,
      range_max    = 0.9,
      description  = "Exchange rate backward-looking share. Fraction of exchange rate expectations that are backward-looking; lower e1 means more forward-looking expectations and stronger UIP arbitrage discipline on the UZS.",
      description_ru = "Доля обратных ожиданий курса. Доля ожиданий обменного курса, основанных на прошлых значениях; низкий e1 = более перспективные ожидания, более сильная дисциплина UIP для UZS.",
      description_uz = "Valyuta kursining orqaga qaragan kutishlari ulushi. O'tgan kurslarga asoslangan kutishlar ulushi; past e1 = ko'proq istiqbolga yo'nalgan kutishlar, UZS uchun kuchliroq UIP intizomi."
    ),
    list(
      symbol       = "pi_target",
      label        = "Inflation target pi*",
      value        = calib$tar,
      range_min    = 3.0,
      range_max    = 12.0,
      description  = "Long-run CBU inflation goal. Official target: 5% for 2024-2026. The Taylor Rule anchors the nominal rate to keep inflation near this value.",
      description_ru = "Долгосрочная цель ЦБУ по инфляции. Официальная цель: 5% на 2024-2026 гг. Правило Тейлора удерживает номинальную ставку вблизи этого значения.",
      description_uz = "CBU ning uzoq muddatli inflyatsiya maqsadi. Rasmiy maqsad: 2024-2026 yillar uchun 5%. Teylor qoidasi nominal stavkani ushbu qiymat atrofida saqlaydi."
    ),
    list(
      symbol       = "rs_neutral",
      label        = "Neutral nominal policy rate",
      value        = calib$rrbar + calib$tar,
      range_min    = 4.0,
      range_max    = 20.0,
      description  = "Neutral nominal policy rate = neutral real rate r_bar (3.5%) + inflation target pi* (5.0%) = 8.5%. The rate consistent with steady-state output and the inflation target; constructed from the two legacy steady-state sliders.",
      description_ru = NA,
      description_uz = NA
    )
  )
}

# ============================================================
#  CORE QPM SOLVER — Bidirectional Gauss-Seidel
#  Ported from solveIRF() in qpm_uzbekistan/index.html.
#  Two-pass structure preserved:
#    PASS 1 backward sweep: UIP exchange rate
#    PASS 2 forward sweep:  IS / Phillips / Taylor
# ============================================================

# Safe array accessor: returns 0 outside the 1..N range.
safe_get <- function(arr, t) {
  if (t < 1 || t > length(arr)) 0 else arr[t]
}

solve_irf <- function(p, shock_type, shock_size, T,
                      init_conds = NULL) {
  has_init <- !is.null(init_conds)
  ST <- if (has_init) 5L else 1L          # pre-history depth
  N  <- T + ST + 10L                      # buffer for t+4 lookups

  gap     <- numeric(N); pie    <- numeric(N); pi4    <- numeric(N)
  rs      <- numeric(N); rr_gap <- numeric(N); mci    <- numeric(N)
  rmc     <- numeric(N); s      <- numeric(N); l_cpi  <- numeric(N)
  l_z_gap <- numeric(N); d4l_s  <- numeric(N); dpm    <- numeric(N)

  if (has_init) {
    for (t in 1:ST) {
      gap[t] <- init_conds$gap
      pie[t] <- init_conds$pi
      rs[t]  <- init_conds$rs
      # Linear s ramp so that d4l_s ~ initial NER-dev by index ST
      s[t]   <- init_conds$d4ls * (t - 1) / (ST - 1)
    }
    for (t in 2:ST) {
      l_cpi[t]   <- l_cpi[t - 1] + pie[t - 1] / 4
      l_z_gap[t] <- s[t] - l_cpi[t]
    }
  }

  shk_gap <- numeric(N); shk_pi  <- numeric(N); shk_s <- numeric(N)
  shk_rs  <- numeric(N); shk_rho <- numeric(N)

  shock_idx <- ST + 1L  # shock lands at the first forecast period
  if (!is.null(shock_type)) {
    switch(shock_type,
      "demand"    = { shk_gap[shock_idx] <- shock_size },
      "inflation" = { shk_pi[shock_idx]  <- shock_size },
      "exchange"  = { shk_s[shock_idx]   <- shock_size },
      "monetary"  = { shk_rs[shock_idx]  <- shock_size },
      "risk"      = { shk_rho[shock_idx] <- shock_size },
      stop("Unknown shock_type: ", shock_type)
    )
  }

  b1 <- p$b1; b2 <- p$b2; b3 <- p$b3; b4 <- p$b4
  a1 <- p$a1; a2 <- p$a2; a3 <- p$a3; a4 <- p$a4
  g1 <- p$g1; g2 <- p$g2; g3 <- p$g3
  e1 <- p$e1

  iters <- 0L

  for (iter in 1:600) {
    iters <- iter
    pi0   <- pie
    s0    <- s
    gap0  <- gap

    # --- PASS 1: Backward sweep for UIP (exchange rate) ---
    # s[t] = (1 - e1) * s[t+1] + e1 * s[t-1] - (rs[t] - rho[t]) / 4 + shk_s[t]
    for (t in (N - 1):(shock_idx)) {
      s[t] <- (1 - e1) * safe_get(s, t + 1) +
              e1 * safe_get(s, t - 1) -
              (rs[t] - shk_rho[t]) / 4 +
              shk_s[t]
    }

    # --- PASS 2: Forward sweep for IS / Phillips / Taylor ---
    for (t in shock_idx:(N - 1)) {
      # CPI price level accumulates from quarterly inflation
      l_cpi[t]   <- l_cpi[t - 1] + safe_get(pie, t - 1) / 4

      # RER gap in deviation form: z_gap = s - l_cpi
      l_z_gap[t] <- safe_get(s, t) - l_cpi[t]

      # Direct import price change (world price dev = 0)
      dpm[t]     <- safe_get(s, t) - safe_get(s, t - 1)

      # Real marginal cost
      rmc[t]     <- a3 * safe_get(gap, t - 1) + (1 - a3) * l_z_gap[t]

      # Phillips curve (hybrid NK + direct import pass-through)
      pie[t]     <- a1 * safe_get(pie, t - 1) +
                    (1 - a1) * safe_get(pie, t + 1) +
                    a2 * rmc[t] +
                    a4 * dpm[t] +
                    shk_pi[t]

      # Refresh l_cpi, z_gap with updated pi[t]
      l_cpi[t]   <- l_cpi[t - 1] + pie[t] / 4
      l_z_gap[t] <- safe_get(s, t) - l_cpi[t]

      # YoY inflation
      pi4[t]     <- (safe_get(pie, t)     + safe_get(pie, t - 1) +
                     safe_get(pie, t - 2) + safe_get(pie, t - 3)) / 4

      # Taylor rule
      rs[t]      <- g1 * safe_get(rs, t - 1) +
                    (1 - g1) * (safe_get(pie, t + 1) +
                                g2 * safe_get(pi4, t + 4) +
                                g3 * safe_get(gap, t - 1)) +
                    shk_rs[t]

      # Real rate gap uses CURRENT rs[t] (not rs[t-1])
      rr_gap[t]  <- rs[t] - safe_get(pie, t + 1)

      # MCI
      mci[t]     <- b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]

      # IS curve
      gap[t]     <- b1 * safe_get(gap, t - 1) - b2 * mci[t] + shk_gap[t]

      # Refresh Phillips with realised gap
      rmc[t]     <- a3 * gap[t] + (1 - a3) * l_z_gap[t]
      pie[t]     <- a1 * safe_get(pie, t - 1) +
                    (1 - a1) * safe_get(pie, t + 1) +
                    a2 * rmc[t] +
                    a4 * dpm[t] +
                    shk_pi[t]
      l_cpi[t]   <- l_cpi[t - 1] + pie[t] / 4
      l_z_gap[t] <- safe_get(s, t) - l_cpi[t]
      pi4[t]     <- (safe_get(pie, t)     + safe_get(pie, t - 1) +
                     safe_get(pie, t - 2) + safe_get(pie, t - 3)) / 4

      # Refresh Taylor + MCI with updated gap and pi
      rs[t]      <- g1 * safe_get(rs, t - 1) +
                    (1 - g1) * (safe_get(pie, t + 1) +
                                g2 * safe_get(pi4, t + 4) +
                                g3 * gap[t]) +
                    shk_rs[t]
      rr_gap[t]  <- rs[t] - safe_get(pie, t + 1)
      mci[t]     <- b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]
    }

    # YoY NER depreciation: D4L_S = L_S[t] - L_S[t-4]
    for (t in 1:N) {
      d4l_s[t] <- safe_get(s, t) - safe_get(s, t - 4)
    }

    # Convergence check (forecast period only)
    max_diff <- 0
    for (t in shock_idx:N) {
      max_diff <- max(
        max_diff,
        abs(pie[t]  - pi0[t]),
        abs(s[t]    - s0[t]),
        abs(gap[t]  - gap0[t])
      )
    }
    if (iter > 3 && max_diff < 1e-10) break
  }

  # Slice output: the T+1 points starting at shock_idx
  out_idx <- shock_idx:(shock_idx + T)
  list(
    gap     = gap[out_idx],
    pi4     = pi4[out_idx],
    rs      = rs[out_idx],
    s       = s[out_idx],
    d4l_s   = d4l_s[out_idx],
    l_z_gap = l_z_gap[out_idx],
    mci     = mci[out_idx],
    iters   = iters
  )
}

# ============================================================
#  SCENARIO ASSEMBLY
# ============================================================

# Build a baseline ER reference path anchored at er_base at Q0 and compounding
# via the baseline solver's d4l_s path. Returned values ARE exchange rate levels
# in UZS/USD under the unshocked baseline.
baseline_er_reference <- function(baseline_sol, calib,
                                  er_base = EXCHANGE_RATE_BASE_UZS_PER_USD) {
  d4ls_level <- calib$tar + baseline_sol$d4l_s
  n  <- length(d4ls_level)
  er <- numeric(n); er[1] <- er_base
  for (t in 2:n) er[t] <- er[t - 1] * (1 + d4ls_level[t] / 400)
  er
}

# Convert solver outputs (deviation form, percent) to LEVEL paths appropriate
# for the frontend contract. The Q0 level difference between a shocked scenario
# and baseline is recovered from the solver's `s` log-level variable, so an
# exchange-rate shock applied at Q0 shows up as a same-quarter UZS jump.
paths_from_solver <- function(sol, baseline_sol, baseline_er, calib) {
  tar     <- calib$tar
  neutral <- calib$rrbar + calib$tar
  gdpbar  <- calib$gdpbar

  gdp_growth  <- gdpbar + sol$gap
  inflation   <- tar + sol$pi4
  policy_rate <- neutral + sol$rs

  # Scale the baseline ER reference by the log-s difference, period-by-period.
  # s is in pp; divide by 100 for log units.
  s_diff_log <- (sol$s - baseline_sol$s) / 100
  er <- baseline_er * exp(s_diff_log)

  list(
    gdp_growth    = round(gdp_growth,  4),
    inflation     = round(inflation,   4),
    policy_rate   = round(policy_rate, 4),
    exchange_rate = round(er,          1)
  )
}

quarter_labels <- function(start_year, start_quarter, n) {
  out <- character(n)
  y <- start_year
  q <- start_quarter
  for (i in 1:n) {
    out[i] <- sprintf("%d Q%d", y, q)
    q <- q + 1L
    if (q > 4L) { q <- 1L; y <- y + 1L }
  }
  out
}

# init_conds in deviation form from level inputs
init_conds_from_levels <- function(levels, calib) {
  neutral <- calib$rrbar + calib$tar
  list(
    pi   = levels$pi   - calib$tar,
    rs   = levels$rs   - neutral,
    gap  = levels$gap,
    d4ls = levels$d4ls - calib$tar
  )
}

# Build one scenario object. Requires the already-computed baseline solver
# output and its ER reference path so that shocked scenarios can be expressed
# as level deviations from baseline.
build_scenario <- function(scenario_id, scenario_name, description,
                           shock_type, shock_size, shocks_applied,
                           calib, baseline_sol, baseline_er,
                           horizon = 8L) {
  init_dev <- init_conds_from_levels(BASELINE_INIT_LEVELS, calib)
  sol      <- solve_irf(
    p          = calib,
    shock_type = shock_type,
    shock_size = shock_size,
    T          = horizon - 1L,
    init_conds = init_dev
  )
  paths <- paths_from_solver(sol, baseline_sol, baseline_er, calib)

  list(
    scenario_id       = scenario_id,
    scenario_name     = scenario_name,
    description       = description,
    horizon_quarters  = horizon,
    periods           = quarter_labels(2026L, 1L, horizon),
    paths             = paths,
    shocks_applied    = shocks_applied,
    solver_iterations = sol$iters
  )
}

build_scenarios <- function(calib = CALIBRATION, horizon = 8L) {
  zero_shocks <- list(rs_shock = 0, s_shock = 0, gap_shock = 0, pie_shock = 0)
  init_dev    <- init_conds_from_levels(BASELINE_INIT_LEVELS, calib)

  # Compute the baseline solver run once; use it to anchor ER levels for all
  # scenarios so that Q0 level differences reflect the actual shock magnitude.
  baseline_sol <- solve_irf(
    p = calib, shock_type = NULL, shock_size = 0,
    T = horizon - 1L, init_conds = init_dev
  )
  baseline_er <- baseline_er_reference(baseline_sol, calib)

  specs <- list(
    list(
      scenario_id    = "baseline",
      scenario_name  = "Baseline",
      description    = "All shocks zero; economy follows the baseline calibration path from Q1 2026 initial conditions (inflation 10.5%, policy rate 13.5%, output gap -1.5%, NER depreciation 8%) toward steady state.",
      shock_type     = NULL, shock_size = 0,
      shocks_applied = zero_shocks
    ),
    list(
      scenario_id    = "rate-cut-100bp",
      scenario_name  = "Policy rate cut (-100 bp)",
      description    = "CBU cuts the policy rate by 100 bp below the Taylor-rule path; expect higher output gap and temporarily faster disinflation response.",
      shock_type     = "monetary", shock_size = -1.0,
      shocks_applied = modifyList(zero_shocks, list(rs_shock = -1.0))
    ),
    list(
      scenario_id    = "rate-hike-100bp",
      scenario_name  = "Policy rate hike (+100 bp)",
      description    = "CBU hikes the policy rate by 100 bp above the Taylor-rule path; expect lower output gap and stronger UZS via the UIP channel.",
      shock_type     = "monetary", shock_size = 1.0,
      shocks_applied = modifyList(zero_shocks, list(rs_shock = 1.0))
    ),
    list(
      scenario_id    = "exchange-rate-shock",
      scenario_name  = "UZS depreciation (+10%)",
      description    = "One-off 10% UZS depreciation against USD; expect inflation spike via direct pass-through (a4) and RER gap, plus policy-rate response.",
      shock_type     = "exchange", shock_size = 10.0,
      shocks_applied = modifyList(zero_shocks, list(s_shock = 10.0))
    ),
    list(
      scenario_id    = "remittance-downside",
      scenario_name  = "Remittance downside (proxy)",
      description    = "Proxy for Russia-slowdown remittance decline using a -0.5 pp aggregate demand shock; implemented via gap_shock while b3 external-demand channel remains inactive in the UI (ROADMAP Phase 1B, QPM item 1).",
      shock_type     = "demand", shock_size = -0.5,
      shocks_applied = modifyList(zero_shocks, list(gap_shock = -0.5))
    )
  )

  lapply(specs, function(sp) {
    build_scenario(
      scenario_id    = sp$scenario_id,
      scenario_name  = sp$scenario_name,
      description    = sp$description,
      shock_type     = sp$shock_type,
      shock_size     = sp$shock_size,
      shocks_applied = sp$shocks_applied,
      calib          = calib,
      baseline_sol   = baseline_sol,
      baseline_er    = baseline_er,
      horizon        = horizon
    )
  })
}

# ============================================================
#  CAVEATS
#  Ported from legacy qpm_uzbekistan/index.html + ROADMAP.md
#  Phase 1B known issues (QPM section).
# ============================================================

build_caveats <- function() {
  list(
    list(
      caveat_id        = "qpm-b3-inactive",
      severity         = "warning",
      message          = "External demand shock parameter b3 is inactive in the UI scenario builder; the Russia/China slowdown channel cannot be simulated directly. The remittance-downside scenario uses a gap_shock proxy until this is activated.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("QPM")),
      source           = "ROADMAP.md Phase 1B QPM item 1"
    ),
    list(
      caveat_id        = "qpm-baseline-irf-reconciliation",
      severity         = "warning",
      message          = "Legacy runBL() baseline forecast historically used an ad-hoc a2*rmc*3 scaling that is inconsistent with solveIRF(). The v2 legacy solver unified both paths through solveIRF(), and this R port matches the unified v2 solver; any residual divergence with older chart snapshots is expected.",
      affected_metrics = I(c("gdp_growth", "inflation", "policy_rate", "exchange_rate")),
      affected_models  = I(c("QPM")),
      source           = "ROADMAP.md Phase 1B QPM item 3"
    ),
    list(
      caveat_id        = "qpm-uip-no-risk-premium",
      severity         = "info",
      message          = "The UIP block contains no persistent country-risk premium; sovereign-risk or capital-flight episodes are approximated only by a one-period rho shock (risk shock type).",
      affected_metrics = I(c("exchange_rate", "inflation")),
      affected_models  = I(c("QPM")),
      source           = "ROADMAP.md Phase 1B QPM item 4"
    ),
    list(
      caveat_id        = "qpm-direct-import-passthrough",
      severity         = "info",
      message          = "Direct quarterly import-price pass-through a4=0.12 is calibrated from Campa & Goldberg (2005) with Uzbekistan's ~35% import share of absorption; a 10% UZS depreciation adds about +1.2 pp to CPI within one quarter through this channel alone.",
      affected_metrics = I(c("inflation")),
      affected_models  = I(c("QPM")),
      source           = "qpm_uzbekistan/index.html Uzbekistan-Specific Notes"
    ),
    list(
      caveat_id        = "qpm-no-uncertainty-bands",
      severity         = "info",
      message          = "Parameter-uncertainty fan charts are not included in this JSON export. The legacy UI provides Monte Carlo bands (8% CV, 80 draws) interactively; adding them to export requires TA decision (ROADMAP cross-model item).",
      affected_metrics = I(c("gdp_growth", "inflation", "policy_rate", "exchange_rate")),
      affected_models  = I(c("QPM")),
      source           = "ROADMAP.md Phase 1B cross-model item 2"
    ),
    list(
      caveat_id        = "qpm-baseline-disinflation-overshoot",
      severity         = "info",
      message          = "From Q1 2026 initial conditions (inflation 10.5%, policy rate 13.5%), the baseline disinflation path overshoots the 5% target and plateaus near 3.4% by the 8-quarter horizon. This is a hybrid-NK model dynamic (forward-looking Phillips + Taylor response), not a bug: disinflation overshoots are documented in calibrated open-economy QPMs. Reviewers should read the baseline path as a transition to target, not as a steady-state level.",
      affected_metrics = I(c("inflation", "policy_rate")),
      affected_models  = I(c("QPM")),
      source           = "Model dynamics; documented 2026-04-20 Sprint 2 bridge review"
    )
  )
}

# ============================================================
#  ASSEMBLY + OUTPUT
# ============================================================

utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

build_attribution <- function() {
  now  <- utc_now()
  date <- format(Sys.time(), "%Y-%m-%d", tz = "UTC")
  list(
    model_id     = "QPM",
    model_name   = "Quarterly Projection Model (Uzbekistan)",
    module       = "qpm",
    version      = SOLVER_VERSION,
    run_id       = paste0("qpm-nightly-", date),
    data_version = DATA_VERSION,
    timestamp    = now
  )
}

assemble_output <- function() {
  list(
    attribution = build_attribution(),
    parameters  = build_parameters(),
    scenarios   = build_scenarios(),
    caveats     = build_caveats(),
    metadata    = list(
      exported_at        = utc_now(),
      source_script_sha  = NA,
      solver_version     = SOLVER_VERSION
    )
  )
}

write_output <- function(output,
                         path = "apps/policy-ui/public/data/qpm.json") {
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  jsonlite::write_json(
    output,
    path       = path,
    auto_unbox = TRUE,
    pretty     = TRUE,
    na         = "null",
    digits     = NA       # full precision for numeric arrays
  )
  invisible(path)
}

# ============================================================
#  MAIN
# ============================================================

main <- function() {
  output <- assemble_output()

  # Dev-mode summary to stdout (useful in CI logs and local runs)
  cat("[export_qpm] attribution:     ",
      output$attribution$model_id, " / ",
      output$attribution$data_version, "\n", sep = "")
  cat("[export_qpm] parameters:      ", length(output$parameters), "\n", sep = "")
  cat("[export_qpm] scenarios:       ", length(output$scenarios), "\n", sep = "")
  cat("[export_qpm] caveats:         ", length(output$caveats), "\n", sep = "")

  for (sc in output$scenarios) {
    h <- sc$horizon_quarters
    cat(sprintf(
      "  - %-22s | iters=%3d | GDP[0]=%.2f GDP[T]=%.2f | pi[0]=%.2f pi[T]=%.2f | RS[0]=%.2f RS[T]=%.2f | ER[0]=%.0f ER[T]=%.0f\n",
      sc$scenario_id, sc$solver_iterations,
      sc$paths$gdp_growth[1],    sc$paths$gdp_growth[h],
      sc$paths$inflation[1],     sc$paths$inflation[h],
      sc$paths$policy_rate[1],   sc$paths$policy_rate[h],
      sc$paths$exchange_rate[1], sc$paths$exchange_rate[h]
    ))
  }

  path <- write_output(output)
  cat("[export_qpm] wrote ", path, "\n", sep = "")
  invisible(output)
}

if (sys.nframe() == 0) {
  main()
}
