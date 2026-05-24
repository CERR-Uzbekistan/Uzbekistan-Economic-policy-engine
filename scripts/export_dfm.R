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
# in dfm_nowcast/dfm_data.js and applies a fixed fan-chart formula. No RNG,
# no network. Running the script twice on the same checkout produces
# byte-identical output.

suppressPackageStartupMessages({
  library(jsonlite)
})

# ============================================================
#  CONSTANTS
# ============================================================

# σ_base — typical DFM out-of-sample RMSE for Uzbekistan quarterly GDP YoY.
# Sourced verbatim from dfm_nowcast/index.html:899-901 so the bridge fan
# chart matches the legacy-UI fan chart point-for-point.
SIGMA_BASE_PP <- 0.45

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
      "Out-of-sample RMSE fan chart, sigma = %.2f pp * sqrt(h), h=%d",
      SIGMA_BASE_PP, horizon
    ),
    is_illustrative = FALSE,
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
      message          = "Fan chart uses a constant sigma_base = 0.45 pp scaled by sqrt(h). This is the pooled out-of-sample RMSE; it does not vary with the current filtered-state covariance V_last. A V_last-aware band is a future enhancement.",
      affected_metrics = I(c("gdp_growth")),
      affected_models  = I(c("DFM")),
      source           = "dfm_nowcast/index.html:899-932"
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
      message          = "The audited source R workflow applies generic log-growth transformations. A production refit needs a per-series transform map for rates, ratios, levels, weekly series, negative values, and already-growth-rate indicators.",
      affected_metrics = I(c("gdp_growth", "indicator_contributions")),
      affected_models  = I(c("DFM")),
      source           = "model sources/Fore+Nowcast/DFM/functions/calculate_growth.R"
    ),
    list(
      caveat_id        = "dfm-backtest-missing",
      severity         = "warning",
      message          = "No source-controlled historical vintage backtest or fit report is published with this artifact. Treat the nowcast as an internal-preview bridge until rolling-origin errors and diagnostics are added.",
      affected_metrics = I(c("gdp_growth", "uncertainty_bands")),
      affected_models  = I(c("DFM")),
      source           = "docs/data-bridge/dfm-model-readiness-note.md"
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
    readiness_status            = list(
      public_status = "internal_preview_bridge",
      source_refit_in_ci = "not_available",
      per_series_transform_map = "not_available",
      historical_backtest = "not_available",
      diagnostics_audit = "not_available",
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
