# export_dfm.R — nightly DFM nowcast export
#
# Produces: apps/policy-ui/public/data/dfm.json
# Source:   dfm_nowcast/dfm_data.js (pre-estimated state-space parameters
#           from the legacy Mixed-frequency DFM — Uzbekistan GDP Nowcasting;
#           see dfm_nowcast/index.html for the runtime consumer).
# Run:      Rscript scripts/export_dfm.R
#
# This script is intended to run in CI (.github/workflows/data-regen.yml;
# DFM entry to be added by the subsequent workflow PR). It is also safely
# runnable locally for development.
#
# Determinism: the script reads the frozen state-space parameters committed
# in dfm_nowcast/dfm_data.js and applies a fixed validation-proxy fan-chart
# formula. No RNG, no network. Running the script twice on the same checkout
# produces byte-identical output except for export timestamps.

suppressPackageStartupMessages({
  library(jsonlite)
})

# ============================================================
#  CONSTANTS
# ============================================================

# sigma_base is the current internal-preview uncertainty proxy for
# Uzbekistan quarterly GDP YoY. It comes from the validation artifact where
# the best historical GDP-only benchmark has RMSE = 3.3867 pp. This is not
# a DFM vintage backtest.
SIGMA_BASE_PP <- 3.3867

# Standard-normal critical values for the fan bands published by the legacy
# UI (same 50/70/90 CIs rendered in dfm_nowcast/index.html:923-932).
CI_LEVELS <- list(
  list(confidence_level = 0.50, z = 0.674),
  list(confidence_level = 0.70, z = 1.036),
  list(confidence_level = 0.90, z = 1.645)
)

SOLVER_VERSION <- "0.1.0"
DATA_VERSION   <- "2026Q1"

SOURCE_ARTIFACT <- "dfm_nowcast/dfm_data.js"
EXPORT_SCRIPT <- "scripts/export_dfm.R"
SOURCE_MODEL_BUNDLE <- "model sources/Fore+Nowcast/DFM"
SOURCE_MODEL_WORKBOOK <- "model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx"
TRANSFORM_MAP_ARTIFACT <- "docs/data-bridge/dfm-transformation-map.json"
TRANSFORM_MAP_CSV <- "docs/data-bridge/dfm-transformation-map.csv"
VALIDATION_ARTIFACT <- "docs/data-bridge/dfm-validation-summary.json"
VALIDATION_REPORT <- "docs/data-bridge/dfm-validation-report.md"
SOURCE_REFIT_ARTIFACT <- "docs/data-bridge/dfm-source-refit-summary.json"

`%||%` <- function(a, b) if (is.null(a)) b else a

hash_file <- function(path) {
  if (!file.exists(path)) return(NA_character_)
  unname(as.character(tools::md5sum(path)))
}

git_blob_sha <- function(path) {
  if (!file.exists(path) || Sys.which("git") == "") return(NA_character_)
  out <- tryCatch(
    system2("git", c("hash-object", path), stdout = TRUE, stderr = FALSE),
    error = function(e) NA_character_
  )
  if (length(out) < 1L || is.na(out[[1L]]) || !nzchar(out[[1L]])) return(NA_character_)
  out[[1L]]
}

read_json_if_exists <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(
    jsonlite::fromJSON(path, simplifyVector = FALSE),
    error = function(e) NULL
  )
}

# ============================================================
#  INPUT — parse the legacy JS artifact
# ============================================================

# The legacy artifact is JS (`window.DFM_DATA = { ...JSON... };`). Strip the
# `window.DFM_DATA =` prefix and the trailing `;` so jsonlite can parse it
# directly; no evaluation, no network.
read_dfm_artifact <- function(path = SOURCE_ARTIFACT) {
  stopifnot(file.exists(path))
  raw <- paste(readLines(path, warn = FALSE), collapse = "\n")
  brace <- regexpr("\\{", raw)
  if (brace < 1L) stop("Could not locate JSON object in ", path)
  json_text <- substring(raw, brace)
  json_text <- sub(";\\s*$", "", json_text)
  jsonlite::fromJSON(json_text, simplifyVector = FALSE)
}

# ============================================================
#  HELPERS
# ============================================================

# "2026-03-01" -> "2026Q1"
iso_to_quarter_label <- function(iso_date) {
  parts <- strsplit(iso_date, "-", fixed = TRUE)[[1]]
  y <- as.integer(parts[1])
  m <- as.integer(parts[2])
  q <- ((m - 1L) %/% 3L) + 1L
  sprintf("%dQ%d", y, q)
}

# "2026-03-01" -> "2026-01-01"
iso_to_quarter_start <- function(iso_date) {
  parts <- strsplit(iso_date, "-", fixed = TRUE)[[1]]
  y <- as.integer(parts[1])
  m <- as.integer(parts[2])
  q_first_month <- ((m - 1L) %/% 3L) * 3L + 1L
  sprintf("%04d-%02d-01", y, q_first_month)
}

# Strict lexical compare on "YYYY-MM-DD" strings.
iso_after <- function(a, b) a > b

# ============================================================
#  NOWCAST SECTION
# ============================================================

# Build the uncertainty bands at a given horizon h (1 = first forecast
# quarter). σ(h) = σ_base × √h; bands are z-scaled.
build_uncertainty <- function(point_pct, horizon) {
  se <- SIGMA_BASE_PP * sqrt(horizon)
  bands <- lapply(CI_LEVELS, function(lv) {
    list(
      confidence_level = lv$confidence_level,
      lower_pct        = round(point_pct - lv$z * se, 4),
      upper_pct        = round(point_pct + lv$z * se, 4)
    )
  })
  list(
    methodology_label = sprintf(
      "Illustrative validation-proxy RMSE range, sigma = %.4f pp * sqrt(h), h=%d",
      SIGMA_BASE_PP, horizon
    ),
    is_illustrative = TRUE,
    bands           = bands
  )
}

build_quarter_entry <- function(date_iso, yoy, qoq, level, horizon = NULL) {
  entry <- list(
    period              = iso_to_quarter_label(date_iso),
    quarter_start_date  = iso_to_quarter_start(date_iso),
    gdp_growth_yoy_pct  = if (is.null(yoy)) NA_real_ else round(yoy, 4),
    gdp_growth_qoq_pct  = if (is.null(qoq)) NA_real_ else round(qoq, 4),
    gdp_level_idx       = if (is.null(level)) NA_real_ else round(level, 3)
  )
  if (!is.null(horizon)) {
    entry$horizon_quarters <- horizon
    entry$uncertainty      <- build_uncertainty(round(yoy, 4), horizon)
  }
  entry
}

build_nowcast <- function(d) {
  gdp  <- d$gdp
  last_data_date <- d$meta$last_data_date  # ISO "YYYY-MM-DD"

  n <- length(gdp$dates)
  stopifnot(n > 0L)

  # Split the quarterly series into history (dates <= last_data_date) and
  # forecast (dates > last_data_date). "current_quarter" is the nearest
  # forecast quarter; any additional forecast quarters become forecast_horizon.
  is_forecast <- vapply(gdp$dates, function(dt) iso_after(dt, last_data_date),
                        logical(1L))
  forecast_idx <- which(is_forecast)
  history_idx  <- which(!is_forecast)

  history <- lapply(history_idx, function(i) {
    build_quarter_entry(gdp$dates[[i]], gdp$grw_yoy[[i]],
                        gdp$grw_qoq[[i]], gdp$level[[i]])
  })

  if (length(forecast_idx) == 0L) {
    current_quarter  <- NULL
    forecast_horizon <- list()
  } else {
    horizons <- seq_along(forecast_idx)
    current_i <- forecast_idx[[1L]]
    current_quarter <- build_quarter_entry(
      gdp$dates[[current_i]], gdp$grw_yoy[[current_i]],
      gdp$grw_qoq[[current_i]], gdp$level[[current_i]],
      horizon = 1L
    )
    forecast_horizon <- if (length(forecast_idx) > 1L) {
      lapply(seq.int(2L, length(forecast_idx)), function(k) {
        i <- forecast_idx[[k]]
        build_quarter_entry(gdp$dates[[i]], gdp$grw_yoy[[i]],
                            gdp$grw_qoq[[i]], gdp$level[[i]],
                            horizon = horizons[[k]])
      })
    } else {
      list()
    }
  }

  list(
    last_observed_date = last_data_date,
    current_quarter    = current_quarter,
    forecast_horizon   = forecast_horizon,
    history            = history
  )
}

# ============================================================
#  FACTOR PATH
# ============================================================

build_factor <- function(d) {
  list(
    n_factors        = d$meta$n_factors,
    dates            = I(unlist(d$factor$dates)),
    path             = I(round(unlist(d$factor$path), 6)),
    converged        = isTRUE(d$meta$converged),
    n_iter           = d$meta$n_iter,
    loglik           = round(as.numeric(d$meta$loglik), 4),
    last_data_date   = d$meta$last_data_date,
    monthly_series_start = d$factor$dates[[1L]]
  )
}

# ============================================================
#  INDICATORS
# ============================================================

build_indicators <- function(d) {
  vars     <- d$vars
  loadings <- d$loadings
  latest   <- d$latest$values %||% list()
  names_v  <- unlist(vars$names)
  labels_v <- unlist(vars$labels)
  cats     <- unlist(vars$categories)
  is_qly   <- unlist(vars$quarterly)
  ld_vals  <- unlist(loadings$values)
  ld_ctrb  <- unlist(loadings$contributions)

  n <- length(names_v)
  stopifnot(length(labels_v) == n, length(cats) == n, length(ld_vals) == n)

  out <- vector("list", n)
  for (i in seq_len(n)) {
    nm <- names_v[[i]]
    latest_value <- latest[[nm]]
    out[[i]] <- list(
      indicator_id = nm,
      label        = labels_v[[i]],
      category     = cats[[i]],
      frequency    = if (isTRUE(is_qly[[i]])) "quarterly" else "monthly",
      loading      = round(ld_vals[[i]], 6),
      contribution = round(ld_ctrb[[i]], 6),
      latest_value = if (is.null(latest_value)) NA_real_ else round(as.numeric(latest_value), 4)
    )
  }

  # Stable ordering: original R-export order is used as the publication
  # order so diffs between nightly runs are minimal.
  out
}

# ============================================================
#  CAVEATS
# ============================================================

build_caveats <- function() {
  list(
    list(
      caveat_id        = "dfm-single-factor",
      severity         = "info",
      message          = "Model uses a single common factor (n_factors = 1). A richer factor structure (e.g., tradable vs non-tradable) would capture more indicator heterogeneity but was judged unnecessary at current data length.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "dfm_nowcast/dfm_data.js meta.n_factors"
    ),
    list(
      caveat_id        = "dfm-fan-chart-rmse-constant",
      severity         = "info",
      message          = "Nowcast bands use an illustrative sigma_base = 3.3867 pp scaled by sqrt(h), calibrated from a historical GDP-only benchmark validation report. This is not a DFM real-time vintage backtest and does not vary with the current filtered-state covariance V_last.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "docs/data-bridge/dfm-validation-summary.json"
    ),
    list(
      caveat_id        = "dfm-quarterly-aggregation",
      severity         = "info",
      message          = "GDP is observed quarterly but the factor is monthly; the quarterly nowcast aggregates monthly factor filtered states through the loading C[gdp_idx]. Intra-quarter revisions to monthly indicators (PR 2+ consumer may surface a 'news decomposition' view) can shift the nowcast without new quarterly data.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "dfm_nowcast/index.html kalmanStep(); mcp_server/models/dfm.py run_kalman_update()"
    ),
    list(
      caveat_id        = "dfm-statoffice-latency",
      severity         = "warning",
      message          = "The current nowcast quarter is defined as any quarter strictly after meta.last_data_date. Official StatOffice YoY publication typically trails by 6-10 weeks, so the current nowcast quarter is expected to be partially or fully 'before publication' and subject to subsequent revision.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "Convention; dfm_nowcast/index.html renderNowcastPage()"
    ),
    list(
      caveat_id        = "dfm-parameters-frozen-at-refit",
      severity         = "warning",
      message          = "State-space parameters (C, A, Q, R, means, sdevs) are produced by an offline EM refit (legacy export_dfm_for_web.R, not in this repository) and are not re-estimated by this export. The nightly export regenerates the consumer JSON from those frozen parameters; a refit is a separate modelling event.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "dfm_nowcast/dfm_data.js header comment"
    ),
    list(
      caveat_id        = "dfm-source-refit-not-automated",
      severity         = "warning",
      message          = "The local source-model bundle is reference material for model review. This export does not read the source workbook or rerun the R EM estimator, so workbook updates require a separate reviewed refit/export step before public dfm.json changes.",
      affected_metrics = I(c("gdp_growth", "factor_path", "indicator_contributions")),
      affected_models  = I(c("DFM")),
      source           = "model sources/Fore+Nowcast/DFM/main.R; scripts/export_dfm.R"
    ),
    list(
      caveat_id        = "dfm-transform-map-needed",
      severity         = "warning",
      message          = "A source-derived transformation map is now published with row-level owner-review decisions. Four rows remain blocked for production refit sign-off, and the source R workflow still applies generic log-growth transformations.",
      affected_metrics = I(c("gdp_growth", "indicator_contributions")),
      affected_models  = I(c("DFM")),
      source           = "docs/data-bridge/dfm-transformation-map.json; model sources/Fore+Nowcast/DFM/functions/calculate_growth.R"
    ),
    list(
      caveat_id        = "dfm-vintage-backtest-blocked",
      severity         = "warning",
      message          = "A historical benchmark validation report is published, but true DFM real-time vintage backtesting is blocked because historical source-workbook vintages or saved pre-release DFM outputs are not source-controlled.",
      affected_metrics = I(c("gdp_growth", "uncertainty_bands")),
      affected_models  = I(c("DFM")),
      source           = "docs/data-bridge/dfm-validation-report.md"
    ),
    list(
      caveat_id        = "dfm-contribution-guardrail",
      severity         = "warning",
      message          = "Top indicator contributions are standardized factor signals. Native-unit source indicators, rates, ratios, and already-growth rows must not be read as direct growth impulses or percentage-point GDP effects.",
      affected_metrics = I(c("indicator_contributions")),
      affected_models  = I(c("DFM")),
      source           = "docs/data-bridge/dfm-transformation-map.json"
    )
  )
}

# ============================================================
#  ATTRIBUTION + ASSEMBLY
# ============================================================

utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

build_attribution <- function() {
  date <- format(Sys.time(), "%Y-%m-%d", tz = "UTC")
  list(
    model_id     = "DFM",
    model_name   = "Dynamic Factor Model - GDP Nowcast (Uzbekistan)",
    module       = "dfm_nowcast",
    version      = SOLVER_VERSION,
    run_id       = paste0("dfm-nightly-", date),
    data_version = DATA_VERSION,
    timestamp    = utc_now()
  )
}

build_metadata <- function(d) {
  source_refit <- read_json_if_exists(SOURCE_REFIT_ARTIFACT)
  source_refit_available <- !is.null(source_refit) &&
    identical(source_refit$artifact$status, "completed_without_pdf_report") &&
    identical(source_refit$estimation$status, "completed")
  source_refit_status <- if (source_refit_available) {
    sprintf(
      "local_source_refit_completed_without_pdf_report; artifact=%s; iterations=%s; converged=%s; source_public_yoy_diff_pp=%s",
      SOURCE_REFIT_ARTIFACT,
      source_refit$estimation$iterations %||% "unknown",
      source_refit$estimation$converged %||% "unknown",
      source_refit$current_nowcast$yoy_difference_source_minus_public_pp %||% "unknown"
    )
  } else {
    "source_R_workflow_audited_but_refit_artifact_not_available"
  }
  source_refit_blocker <- if (source_refit_available) {
    "No local Rscript blocker remains. Remaining blockers: public export still publishes the frozen dfm_nowcast bridge until source-refit output is reconciled and signed off; PDF report rendering requires Pandoc; CI still needs a reproducible R dependency setup."
  } else {
    "Source refit summary is not available. Run scripts/dfm/run-source-refit.R with a configured R runtime and required packages, then review output before replacing the frozen public bridge."
  }

  list(
    exported_at                 = utc_now(),
    source_script_sha           = git_blob_sha(EXPORT_SCRIPT),
    solver_version              = SOLVER_VERSION,
    source_artifact             = SOURCE_ARTIFACT,
    source_artifact_md5         = hash_file(SOURCE_ARTIFACT),
    source_artifact_exported_at = d$meta$exported_at,
    export_script               = EXPORT_SCRIPT,
    export_script_md5           = hash_file(EXPORT_SCRIPT),
    export_mode                 = "frozen_state_space_bridge",
    source_model_reference      = list(
      status = "reference_only_not_public_export_input",
      path = SOURCE_MODEL_BUNDLE,
      data_workbook = SOURCE_MODEL_WORKBOOK,
      source_workbook_updates_require_refit = TRUE,
      public_export_reads_source_workbook = FALSE
    ),
    source_audit                = list(
      source_folder_status = if (dir.exists(SOURCE_MODEL_BUNDLE)) "available_locally_untracked" else "not_available",
      workbook_status = if (file.exists(SOURCE_MODEL_WORKBOOK)) "available_locally_untracked" else "not_available",
      workbook_md5 = hash_file(SOURCE_MODEL_WORKBOOK),
      source_scripts = I(c(
        "main.R",
        "settings.R",
        "functions/prepare_data.R",
        "functions/calculate_growth.R",
        "functions/estimate_dfm.R",
        "functions/predict_dfm.R",
        "functions/postprocess_gdp.R",
        "functions/diagnostics_dfm.R"
      )),
      saved_model_objects = I(c(".RData", "output/results.RData", "output/report.pdf"))
    ),
    transformation_map          = list(
      status = "available_with_owner_review_decisions",
      json_artifact = TRANSFORM_MAP_ARTIFACT,
      csv_artifact = TRANSFORM_MAP_CSV,
      public_indicator_coverage = "36_of_36",
      reviewed_blockers = I(c(
        "four_rows_blocked_for_model_owner_decision_before_production_refit",
        "weekly_exchange_rate_harmonization_needs_model_owner_signoff",
        "generic_log_difference_source_workflow_not_final_for_all_series",
        "public_contributions_remain_factor_signals_not_gdp_percentage_point_effects"
      ))
    ),
    refit_status                = list(
      status = if (source_refit_available) "available" else "blocked_in_current_environment",
      public_export_reads_source_workbook = FALSE,
      blocker = source_refit_blocker,
      source_logic_status = source_refit_status
    ),
    backtest_status             = list(
      status = "proxy_validation_available",
      validation_artifact = VALIDATION_ARTIFACT,
      validation_report = VALIDATION_REPORT,
      vintage_backtest = "blocked_no_historical_vintages",
      benchmark = "four_quarter_trailing_average_yoy",
      rmse_pp = SIGMA_BASE_PP
    ),
    uncertainty_range           = list(
      status = "available_illustrative",
      sigma_base_pp = SIGMA_BASE_PP,
      method = "historical GDP benchmark RMSE scaled by sqrt(h)",
      calibration_source = VALIDATION_ARTIFACT,
      is_official_forecast_interval = FALSE
    ),
    contribution_diagnostics    = list(
      status = "guarded_factor_signal_only",
      top_contribution_audit = "native-unit and rate rows are labelled as non-growth source indicators in the UI",
      not_percentage_point_gdp_effects = TRUE
    ),
    readiness_status            = list(
      public_status = "internal_preview_bridge",
      source_refit_in_ci = "not_available",
      per_series_transform_map = "available",
      historical_backtest = "available",
      diagnostics_audit = "available",
      economist_signoff = "not_available"
    )
  )
}

assemble_output <- function() {
  d <- read_dfm_artifact()
  list(
    attribution = build_attribution(),
    nowcast     = build_nowcast(d),
    factor      = build_factor(d),
    indicators  = build_indicators(d),
    caveats     = build_caveats(),
    metadata    = build_metadata(d)
  )
}

write_output <- function(output,
                         path = "apps/policy-ui/public/data/dfm.json") {
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  jsonlite::write_json(
    output,
    path       = path,
    auto_unbox = TRUE,
    pretty     = TRUE,
    na         = "null",
    digits     = NA
  )
  invisible(path)
}

# ============================================================
#  MAIN
# ============================================================

main <- function() {
  output <- assemble_output()

  cat("[export_dfm] attribution:    ",
      output$attribution$model_id, " / ",
      output$attribution$data_version, "\n", sep = "")
  cat("[export_dfm] last observed:  ", output$nowcast$last_observed_date, "\n", sep = "")
  cq <- output$nowcast$current_quarter
  if (!is.null(cq)) {
    cat(sprintf(
      "[export_dfm] current quarter: %s YoY=%.2f%% QoQ=%.2f%% (h=1, 90%% CI [%.2f, %.2f])\n",
      cq$period, cq$gdp_growth_yoy_pct, cq$gdp_growth_qoq_pct,
      cq$uncertainty$bands[[3L]]$lower_pct,
      cq$uncertainty$bands[[3L]]$upper_pct
    ))
  }
  cat("[export_dfm] forecast h>1:   ", length(output$nowcast$forecast_horizon %||% list()), "\n", sep = "")
  cat("[export_dfm] history points: ", length(output$nowcast$history), "\n", sep = "")
  cat("[export_dfm] indicators:     ", length(output$indicators), "\n", sep = "")
  cat("[export_dfm] caveats:        ", length(output$caveats), "\n", sep = "")
  cat("[export_dfm] factor loglik:  ", output$factor$loglik,
      "  (converged=", output$factor$converged, ", n_iter=", output$factor$n_iter, ")\n", sep = "")

  path <- write_output(output)
  cat("[export_dfm] wrote ", path, "\n", sep = "")
  invisible(output)
}

if (sys.nframe() == 0) {
  main()
}
