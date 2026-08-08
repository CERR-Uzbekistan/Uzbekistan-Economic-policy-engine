# Review DFM sensitivity to caveated transformation choices.
#
# The baseline source workflow log-differences every series after optional
# seasonal adjustment. This runner tests whether the 2026Q2 nowcast changes
# materially when caveated rows receive transformation-map alternatives or are
# removed from the high-frequency block.

suppressPackageStartupMessages({
  library(jsonlite)
  library(readxl)
  library(dplyr)
  library(pracma)
  library(Matrix)
  library(zoo)
  library(purrr)
  library(lubridate)
  library(tidyr)
  library(signal)
  library(seasonal)
  library(urca)
  library(ggplot2)
})

args <- commandArgs(trailingOnly = TRUE)
positional_args <- args[!grepl("^--", args)]
arg_value <- function(name, default = NA_character_) {
  hit <- args[grepl(paste0("^--", name, "="), args)][1L]
  if (is.na(hit) || !nzchar(hit)) return(default)
  sub(paste0("^--", name, "="), "", hit)
}

repo_root <- if (length(positional_args) >= 1L) positional_args[[1L]] else getwd()
repo_root <- normalizePath(repo_root, winslash = "/", mustWork = TRUE)
source_dir <- arg_value(
  "source-dir",
  Sys.getenv("DFM_SOURCE_DIR", file.path(repo_root, "model sources", "Fore+Nowcast", "DFM"))
)
source_dir <- normalizePath(source_dir, winslash = "/", mustWork = FALSE)
source_workbook <- file.path(source_dir, "data", "data_uzbekistan.xlsx")
transform_map_path <- file.path(repo_root, "docs", "data-bridge", "dfm-transformation-map.json")

output_json <- normalizePath(
  arg_value("output-json", file.path(repo_root, "docs", "data-bridge", "dfm-transformation-robustness-review.json")),
  winslash = "/",
  mustWork = FALSE
)
output_md <- normalizePath(
  arg_value("output-md", file.path(repo_root, "docs", "data-bridge", "dfm-transformation-robustness-review.md")),
  winslash = "/",
  mustWork = FALSE
)

if (!dir.exists(source_dir)) stop("DFM source folder is not available: ", source_dir)
if (!file.exists(source_workbook)) stop("DFM source workbook is not available: ", source_workbook)
if (!file.exists(transform_map_path)) stop("DFM transformation map is not available: ", transform_map_path)

`%||%` <- function(a, b) if (is.null(a)) b else a

round_clean <- function(value, digits = 4) {
  rounded <- round(value, digits)
  if (is.na(rounded)) return(NA_real_)
  if (abs(rounded) < 10^(-digits)) return(0)
  rounded
}

hash_file <- function(path) {
  if (!file.exists(path)) return(NA_character_)
  unname(as.character(tools::md5sum(path)))
}
portable_review_path <- function(path) {
  normalized <- normalizePath(path, winslash = "/", mustWork = FALSE)
  source_root <- normalizePath(source_dir, winslash = "/", mustWork = FALSE)
  repository_root <- normalizePath(repo_root, winslash = "/", mustWork = FALSE)
  if (identical(normalized, source_root)) return("<DFM_SOURCE_DIR>")
  if (startsWith(normalized, paste0(source_root, "/"))) {
    return(paste0("<DFM_SOURCE_DIR>/", substring(normalized, nchar(source_root) + 2L)))
  }
  if (startsWith(normalized, paste0(repository_root, "/"))) {
    return(substring(normalized, nchar(repository_root) + 2L))
  }
  paste0("<EXTERNAL_PATH>/", basename(normalized))
}


utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

quarter_period <- function(date) {
  if (is.na(date)) return(NA_character_)
  sprintf("%sQ%s", lubridate::year(date), lubridate::quarter(date))
}

read_json_if_exists <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(jsonlite::fromJSON(path, simplifyVector = FALSE), error = function(e) NULL)
}

capture_warnings <- function(expr) {
  warnings_seen <- character()
  value <- withCallingHandlers(
    expr,
    warning = function(w) {
      warnings_seen <<- unique(c(warnings_seen, conditionMessage(w)))
      invokeRestart("muffleWarning")
    }
  )
  list(value = value, warnings = warnings_seen)
}

md_table <- function(rows, columns) {
  header <- paste(columns, collapse = " | ")
  divider <- paste(rep("---", length(columns)), collapse = " | ")
  body <- vapply(rows, function(row) {
    paste(vapply(columns, function(col) as.character(row[[col]] %||% ""), character(1L)), collapse = " | ")
  }, character(1L))
  paste(c(header, divider, body), collapse = "\n")
}

caveated_rows <- function() {
  transform_map <- jsonlite::fromJSON(transform_map_path, simplifyVector = FALSE)
  rows <- Filter(function(row) identical(row$transformation_status, "approved_with_caveat"), transform_map$variables)
  rows <- Filter(function(row) !identical(row$variable_id, "gdp"), rows)
  rows
}

has_flag <- function(row, flag) {
  flags <- unlist(row$risk_flags %||% list(), use.names = FALSE)
  flag %in% flags
}

growth_like_signal <- function(values) {
  out <- rep(NA_real_, length(values))
  idx <- which(!is.na(values) & values > 0)
  if (length(idx) == 0L) return(out)
  med <- median(values[idx], na.rm = TRUE)
  base <- if (!is.na(med) && med > 500) 1000 else if (!is.na(med) && med > 20) 100 else 1
  out[idx] <- log(values[idx] / base)
  out
}

diff_signal <- function(values) {
  out <- rep(NA_real_, length(values))
  idx <- which(!is.na(values))
  if (length(idx) <= 1L) return(out)
  out[idx] <- c(NA_real_, diff(values[idx]))
  out
}

align_signal_to_growth <- function(df, df_grw, code, signal) {
  signal_df <- data.frame(date = df$date, value = signal)
  signal_df$value[match(df_grw$date, signal_df$date)]
}

transformation_mode <- function(row) {
  code <- row$variable_id
  if (code %in% c("uzs_usd", "stock_deals")) return("source_log_difference")
  if (has_flag(row, "already_growth_series")) return("native_growth_level_signal")
  if (has_flag(row, "rate") || has_flag(row, "ratio")) return("month_to_month_level_change")
  if (code %in% c("bus_clim", "bus_clim_exp")) return("month_to_month_level_change")
  "source_log_difference"
}

apply_reviewed_transformations <- function(prepared, rows) {
  df_grw <- prepared$df_grw
  decisions <- lapply(rows, function(row) {
    code <- row$variable_id
    mode <- transformation_mode(row)
    if (!(code %in% colnames(df_grw)) || !(code %in% colnames(prepared$df))) {
      return(list(variable_id = code, mode = "not_available", replaced = FALSE))
    }
    if (identical(mode, "native_growth_level_signal")) {
      signal <- growth_like_signal(prepared$df[[code]])
      df_grw[[code]] <<- align_signal_to_growth(prepared$df, df_grw, code, signal)
      return(list(variable_id = code, mode = mode, replaced = TRUE))
    }
    if (identical(mode, "month_to_month_level_change")) {
      signal <- diff_signal(prepared$df[[code]])
      df_grw[[code]] <<- align_signal_to_growth(prepared$df, df_grw, code, signal)
      return(list(variable_id = code, mode = mode, replaced = TRUE))
    }
    list(variable_id = code, mode = mode, replaced = FALSE)
  })
  list(df_grw = df_grw, decisions = decisions)
}

run_model_case <- function(case_id, label, prepared, df_grw_case, max_iter, threshold) {
  start_time <- Sys.time()
  captured <- capture_warnings({
    assign("df", prepared$df, envir = .GlobalEnv)
    est_dfm <- estimate_dfm(df_grw_case, blocks = NA, p = 1, max_iter = max_iter, threshold = threshold)
    pred_dfm <- predict_dfm(df_grw_case, est_dfm, months_ahead, lag = 0)
    gdp <- postprocess_gdp(pred_dfm)
    list(est_dfm = est_dfm, pred_dfm = pred_dfm, gdp = gdp)
  })
  result <- captured$value
  last_observed_gdp_date <- max(prepared$df$date[!is.na(prepared$df$gdp)])
  forecast_rows <- result$gdp[result$gdp$date > last_observed_gdp_date, , drop = FALSE]
  current <- if (nrow(forecast_rows) > 0L) forecast_rows[1L, , drop = FALSE] else NULL
  elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
  list(
    case_id = case_id,
    label = label,
    status = "completed",
    converged = identical(result$est_dfm$convergence, 1),
    iterations = result$est_dfm$num_iter,
    loglik = round_clean(result$est_dfm$loglik, 6),
    variable_count = ncol(df_grw_case) - 1L,
    last_growth_date = as.character(max(df_grw_case$date)),
    last_observed_gdp_date = as.character(last_observed_gdp_date),
    nowcast_period = if (is.null(current)) NA_character_ else quarter_period(current$date[[1L]]),
    gdp_growth_yoy_pct = if (is.null(current)) NA_real_ else round_clean(current$gdp_grw_yoy[[1L]]),
    gdp_growth_qoq_pct = if (is.null(current)) NA_real_ else round_clean(current$gdp_grw_qoq[[1L]]),
    gdp_level = if (is.null(current)) NA_real_ else round_clean(current$gdp_lev[[1L]], 1),
    elapsed_seconds = round(elapsed, 2),
    warnings = as.list(unique(captured$warnings))
  )
}

old_wd <- getwd()
on.exit(setwd(old_wd), add = TRUE)
setwd(source_dir)

source("settings.R")
list.files(path = "functions", pattern = "\\.R$", full.names = TRUE) |>
  sort() |>
  purrr::walk(source)

max_iter <- as.integer(Sys.getenv("DFM_MAX_ITER", "200"))
threshold <- as.numeric(Sys.getenv("DFM_THRESHOLD", "1e-5"))
robustness_ref <- read_json_if_exists(file.path(repo_root, "docs", "data-bridge", "dfm-2026q2-robustness-review.json"))
baseline_yoy <- robustness_ref$baseline$gdp_growth_yoy_pct %||% NA_real_
baseline_qoq <- robustness_ref$baseline$gdp_growth_qoq_pct %||% NA_real_

message("[dfm:transform-review] preparing source data")
prepared <- prepare_data(file_path = "data/data_uzbekistan.xlsx", start_date = start_date)
rows <- caveated_rows()
caveated_ids <- vapply(rows, function(row) row$variable_id, character(1L))
drop_ids <- intersect(caveated_ids, colnames(prepared$df_grw))

message("[dfm:transform-review] running reviewed transformation variant")
reviewed <- apply_reviewed_transformations(prepared, rows)
reviewed_case <- run_model_case(
  "reviewed_caveat_transformations",
  "Apply transformation-map alternatives for caveated rows where possible",
  prepared,
  reviewed$df_grw,
  max_iter = max_iter,
  threshold = threshold
)

message("[dfm:transform-review] running caveated-row leave-out variant")
drop_df_grw <- prepared$df_grw[, setdiff(colnames(prepared$df_grw), drop_ids), drop = FALSE]
drop_case <- run_model_case(
  "drop_caveated_high_frequency_rows",
  "Drop approved-with-caveat high-frequency rows",
  prepared,
  drop_df_grw,
  max_iter = max_iter,
  threshold = threshold
)

cases <- list(reviewed_case, drop_case)
sensitivity <- lapply(cases, function(case) {
  list(
    case_id = case$case_id,
    yoy_difference_vs_baseline_pp = round_clean(case$gdp_growth_yoy_pct - baseline_yoy),
    qoq_difference_vs_baseline_pp = round_clean(case$gdp_growth_qoq_pct - baseline_qoq)
  )
})

max_abs_yoy <- max(abs(vapply(sensitivity, function(row) row$yoy_difference_vs_baseline_pp, numeric(1L))), na.rm = TRUE)
any_nonconverged <- any(!vapply(cases, function(case) isTRUE(case$converged), logical(1L)))
reviewer_warnings <- c(
  if (any_nonconverged) {
    "At least one transformation stress case did not converge before the iteration cap, so that case is a stress-test signal rather than a replacement specification."
  } else {
    "All transformation stress cases converged under the configured EM iteration cap."
  },
  "If the reviewed-transformation variant moves materially, do not publish the baseline source nowcast without resolving transformation ownership.",
  "If the caveated-row leave-out variant moves materially, the one-factor result depends too much on weakly documented rows."
)
verdict_status <- if (is.na(max_abs_yoy)) {
  "blocked_missing_baseline_reference"
} else if (max_abs_yoy > 1) {
  "not_robust_to_transformation_assumptions"
} else if (max_abs_yoy > 0.5) {
  "material_transformation_sensitivity"
} else if (any_nonconverged) {
  "small_headline_sensitivity_with_convergence_caveat"
} else {
  "passes_initial_transformation_sensitivity"
}

payload <- list(
  artifact = list(
    id = "dfm-transformation-robustness-review",
    generated_at = utc_now(),
    source_folder = portable_review_path(source_dir),
    source_workbook = portable_review_path(source_workbook),
    source_workbook_md5 = hash_file(source_workbook),
    transformation_map = portable_review_path(transform_map_path),
    runner = "scripts/dfm/review-transformation-robustness.R",
    r_version = paste(R.version$major, R.version$minor, sep = "."),
    em_settings = list(
      max_iter = max_iter,
      threshold = threshold
    )
  ),
  baseline_reference = list(
    status = if (is.null(robustness_ref)) "not_available" else "available_from_robustness_review",
    json_artifact = "docs/data-bridge/dfm-2026q2-robustness-review.json",
    nowcast_period = robustness_ref$baseline$nowcast_period %||% NA_character_,
    gdp_growth_yoy_pct = baseline_yoy,
    gdp_growth_qoq_pct = baseline_qoq
  ),
  caveated_rows = list(
    count = length(caveated_ids),
    variable_ids = as.list(caveated_ids),
    dropped_in_leave_out_case = as.list(drop_ids),
    reviewed_transformation_decisions = reviewed$decisions
  ),
  cases = cases,
  sensitivity = sensitivity,
  reviewer_verdict = list(
    status = verdict_status,
    max_abs_yoy_difference_pp = round_clean(max_abs_yoy),
    any_nonconverged_case = any_nonconverged,
    critical = as.list(c(
      "This test does not prove the recommended transformations are final; it only measures headline sensitivity to the current caveated rows.",
      "Rows using native growth-level signals still require model-owner confirmation of scaling and source definitions."
    )),
    warnings = as.list(reviewer_warnings)
  )
)

case_rows <- lapply(cases, function(case) {
  diff <- sensitivity[[match(case$case_id, vapply(sensitivity, function(x) x$case_id, character(1L)))]]
  list(
    case = case$case_id,
    yoy_pct = case$gdp_growth_yoy_pct,
    qoq_pct = case$gdp_growth_qoq_pct,
    yoy_diff_pp = diff$yoy_difference_vs_baseline_pp,
    converged = case$converged,
    iterations = case$iterations,
    variables = case$variable_count
  )
})
decision_rows <- lapply(reviewed$decisions, function(row) {
  list(
    id = row$variable_id,
    mode = row$mode,
    replaced = row$replaced
  )
})

md <- paste(
  "# DFM transformation robustness review",
  "",
  paste0("Generated: ", payload$artifact$generated_at),
  "",
  "## Baseline reference",
  "",
  paste0(
    "Baseline source workflow: ",
    payload$baseline_reference$nowcast_period,
    " YoY ",
    payload$baseline_reference$gdp_growth_yoy_pct,
    "%, QoQ ",
    payload$baseline_reference$gdp_growth_qoq_pct,
    "%."
  ),
  "",
  "## Stress cases",
  "",
  paste0("EM settings: max_iter=", payload$artifact$em_settings$max_iter, ", threshold=", payload$artifact$em_settings$threshold),
  "",
  md_table(case_rows, c("case", "yoy_pct", "qoq_pct", "yoy_diff_pp", "converged", "iterations", "variables")),
  "",
  "## Reviewed transformation decisions",
  "",
  md_table(decision_rows, c("id", "mode", "replaced")),
  "",
  "## Hostile-review verdict",
  "",
  paste0("Status: ", payload$reviewer_verdict$status),
  "",
  paste0("Maximum absolute YoY movement versus baseline: ", payload$reviewer_verdict$max_abs_yoy_difference_pp, " pp."),
  "",
  paste0("Any nonconverged case: ", payload$reviewer_verdict$any_nonconverged_case),
  "",
  "Critical:",
  paste0("- ", unlist(payload$reviewer_verdict$critical), collapse = "\n"),
  "",
  "Warnings:",
  paste0("- ", unlist(payload$reviewer_verdict$warnings), collapse = "\n"),
  "",
  "Interpretation rule:",
  "- Passing this test would support internal review, not production readiness.",
  "- Failing this test means the baseline nowcast should remain blocked until transformation ownership is resolved.",
  "",
  sep = "\n"
)

dir.create(dirname(output_json), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(payload, output_json, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)
while (length(md) > 0L && !nzchar(tail(md, 1L))) md <- head(md, -1L)
writeLines(md, output_md, useBytes = TRUE)

message("[dfm:transform-review] wrote ", output_json)
message("[dfm:transform-review] wrote ", output_md)
