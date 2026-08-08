# Export a review-only DFM source-output artifact.
#
# This script inspects an owner-supplied source folder and writes compact
# JSON/Markdown outputs for model review. It intentionally does not update the
# public apps/policy-ui/public/data/dfm.json artifact.

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
saved_results <- file.path(source_dir, "output", "results.RData")

output_json <- normalizePath(
  arg_value("output-json", file.path(repo_root, "docs", "data-bridge", "dfm-source-output-review.json")),
  winslash = "/",
  mustWork = FALSE
)
output_md <- normalizePath(
  arg_value("output-md", file.path(repo_root, "docs", "data-bridge", "dfm-source-output-review.md")),
  winslash = "/",
  mustWork = FALSE
)

if (!dir.exists(source_dir)) stop("DFM source folder is not available: ", source_dir)
if (!file.exists(source_workbook)) stop("DFM source workbook is not available: ", source_workbook)

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

latest_non_na <- function(values, dates) {
  idx <- which(!is.na(values))
  if (length(idx) == 0L) return(list(value = NA_real_, date = NA_character_))
  last_idx <- idx[[length(idx)]]
  list(value = as.numeric(values[[last_idx]]), date = as.character(dates[[last_idx]]))
}

read_json_if_exists <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(jsonlite::fromJSON(path, simplifyVector = FALSE), error = function(e) NULL)
}

md_table <- function(rows, columns) {
  header <- paste(columns, collapse = " | ")
  divider <- paste(rep("---", length(columns)), collapse = " | ")
  body <- vapply(rows, function(row) {
    paste(vapply(columns, function(col) as.character(row[[col]] %||% ""), character(1L)), collapse = " | ")
  }, character(1L))
  paste(c(header, divider, body), collapse = "\n")
}

source_gdp_history_audit <- function(workbook, adjusted_gdp) {
  series_info <- suppressMessages(readxl::read_excel(workbook, sheet = "Series Information"))
  quarterly <- suppressMessages(readxl::read_excel(workbook, sheet = "Request Quarterly"))
  gdp_meta_index <- if ("Code key" %in% names(series_info)) {
    which(series_info[["Code key"]] == "gdp")[1L]
  } else {
    NA_integer_
  }
  source_series_label <- if (!is.na(gdp_meta_index) && "Series description" %in% names(series_info)) {
    as.character(series_info[["Series description"]][[gdp_meta_index]])
  } else {
    names(quarterly)[[2L]]
  }
  source_provenance <- if (!is.na(gdp_meta_index) && "Source" %in% names(series_info)) {
    as.character(series_info[["Source"]][[gdp_meta_index]])
  } else {
    NA_character_
  }
  if (is.na(source_provenance) || !nzchar(trimws(source_provenance))) {
    source_provenance <- NA_character_
  }
  display_rule <- paste(
    "Source-workbook GDP history is audit-only until source provenance and series continuity are verified;",
    "seasonally adjusted GDP is model input, not an official release."
  )
  if (ncol(quarterly) < 2L) {
    return(list(
      status = "blocked_missing_quarterly_gdp",
      source_series_label = source_series_label,
      source_provenance = source_provenance,
      display_rule = display_rule
    ))
  }

  raw <- data.frame(
    date = as.Date(quarterly[[1L]]) %m+% months(2),
    raw_gdp_level = suppressWarnings(as.numeric(quarterly[[2L]]))
  )
  raw <- raw[!is.na(raw$date), , drop = FALSE]
  raw$raw_gdp_growth_yoy_pct <- NA_real_
  if (nrow(raw) >= 5L) {
    for (i in 5:nrow(raw)) {
      current <- raw$raw_gdp_level[[i]]
      previous_year <- raw$raw_gdp_level[[i - 4L]]
      if (!is.na(current) && !is.na(previous_year) && previous_year != 0) {
        raw$raw_gdp_growth_yoy_pct[[i]] <- (current / previous_year - 1) * 100
      }
    }
  }

  adjusted <- adjusted_gdp[, c("date", "gdp_lev", "gdp_grw_yoy"), drop = FALSE]
  names(adjusted) <- c("date", "model_adjusted_gdp_level", "model_adjusted_gdp_growth_yoy_pct")
  aligned <- merge(raw, adjusted, by = "date", all.x = TRUE, sort = TRUE)
  aligned$model_adjusted_minus_raw_yoy_pp <-
    aligned$model_adjusted_gdp_growth_yoy_pct - aligned$raw_gdp_growth_yoy_pct

  observed <- aligned[!is.na(aligned$raw_gdp_level), , drop = FALSE]
  observed_with_yoy <- observed[!is.na(observed$raw_gdp_growth_yoy_pct), , drop = FALSE]
  if (nrow(observed_with_yoy) == 0L) {
    return(list(
      status = "blocked_no_yoy_history",
      source_series_label = source_series_label,
      source_provenance = source_provenance,
      display_rule = display_rule
    ))
  }

  latest <- observed_with_yoy[nrow(observed_with_yoy), , drop = FALSE]
  recent <- tail(observed_with_yoy, 8L)
  recent_records <- lapply(seq_len(nrow(recent)), function(i) {
    row <- recent[i, , drop = FALSE]
    list(
      period = quarter_period(row$date[[1L]]),
      quarter_end_date = as.character(row$date[[1L]]),
      raw_gdp_level = round_clean(row$raw_gdp_level[[1L]], 1),
      raw_gdp_growth_yoy_pct = round_clean(row$raw_gdp_growth_yoy_pct[[1L]]),
      model_adjusted_gdp_level = round_clean(row$model_adjusted_gdp_level[[1L]], 1),
      model_adjusted_gdp_growth_yoy_pct = round_clean(row$model_adjusted_gdp_growth_yoy_pct[[1L]]),
      model_adjusted_minus_raw_yoy_pp = round_clean(row$model_adjusted_minus_raw_yoy_pp[[1L]])
    )
  })

  list(
    status = "review_only_unverified",
    source_series_label = source_series_label,
    source_provenance = source_provenance,
    latest_observed_period = quarter_period(latest$date[[1L]]),
    latest_observed_quarter_end_date = as.character(latest$date[[1L]]),
    raw_gdp_level = round_clean(latest$raw_gdp_level[[1L]], 1),
    raw_gdp_growth_yoy_pct = round_clean(latest$raw_gdp_growth_yoy_pct[[1L]]),
    model_adjusted_gdp_level = round_clean(latest$model_adjusted_gdp_level[[1L]], 1),
    model_adjusted_gdp_growth_yoy_pct = round_clean(latest$model_adjusted_gdp_growth_yoy_pct[[1L]]),
    model_adjusted_minus_raw_yoy_pp = round_clean(latest$model_adjusted_minus_raw_yoy_pp[[1L]]),
    display_rule = display_rule,
    interpretation = paste(
      "The comparison diagnoses how seasonal adjustment changes the GDP input.",
      "It must not be presented as official history until the workbook source and series continuity are verified."
    ),
    recent_quarters = recent_records
  )
}

coverage_summary <- function(workbook) {
  meta <- suppressMessages(readxl::read_excel(workbook, sheet = "Series Information"))
  monthly <- suppressMessages(readxl::read_excel(workbook, sheet = "Request Monthly"))
  monthly <- monthly[-1, ]
  monthly[[1]] <- as.Date(monthly[[1]])
  monthly[, -1] <- lapply(monthly[, -1], function(x) as.numeric(as.character(x)))
  monthly_codes <- meta$`Code key`[meta$Frequency != "Quarterly"]
  names(monthly) <- c("date", monthly_codes)
  last_dates <- lapply(monthly_codes, function(code) {
    latest <- latest_non_na(monthly[[code]], monthly$date)
    list(variable_id = code, latest_date = latest$date)
  })
  latest_counts <- table(vapply(last_dates, function(x) x$latest_date, character(1L)))
  list(
    monthly_row_count = nrow(monthly),
    monthly_start_date = as.character(min(monthly$date, na.rm = TRUE)),
    monthly_end_date = as.character(max(monthly$date, na.rm = TRUE)),
    latest_date_counts = as.list(as.integer(latest_counts)),
    latest_date_labels = as.list(names(latest_counts)),
    series_latest_dates = last_dates
  )
}

driver_table <- function(est_dfm, prepared, limit = 14L) {
  df_grw <- prepared$df_grw
  meta <- prepared$meta
  variables <- est_dfm$model
  means <- as.numeric(est_dfm$means[1, variables])
  sdevs <- as.numeric(est_dfm$sdevs[1, variables])
  loading <- as.numeric(est_dfm$C[seq_along(variables), 1])
  rows <- lapply(seq_along(variables), function(i) {
    code <- variables[[i]]
    if (code == "gdp") return(NULL)
    latest_growth <- latest_non_na(df_grw[[code]], df_grw$date)
    latest_level <- latest_non_na(prepared$df[[code]], prepared$df$date)
    standardized <- if (is.na(latest_growth$value) || is.na(sdevs[[i]]) || sdevs[[i]] == 0) {
      NA_real_
    } else {
      (latest_growth$value - means[[i]]) / sdevs[[i]]
    }
    meta_row <- meta[meta$`Code key` == code, , drop = FALSE]
    contribution <- standardized * loading[[i]]
    list(
      variable_id = code,
      label = if (nrow(meta_row) == 0L) code else as.character(meta_row$`Series description`[[1L]]),
      category = if (nrow(meta_row) == 0L) NA_character_ else as.character(meta_row$Category[[1L]]),
      frequency = if (nrow(meta_row) == 0L) NA_character_ else as.character(meta_row$Frequency[[1L]]),
      source_unit = if (nrow(meta_row) == 0L) NA_character_ else as.character(meta_row$Unit[[1L]]),
      latest_level_date = latest_level$date,
      latest_level_value = round_clean(latest_level$value, 4),
      latest_growth_date = latest_growth$date,
      latest_transformed_growth = round_clean(latest_growth$value, 6),
      standardized_signal = round_clean(standardized, 6),
      loading = round_clean(loading[[i]], 6),
      contribution = round_clean(contribution, 6),
      direction = if (is.na(contribution)) "missing" else if (contribution > 0) "supports_nowcast" else "drags_nowcast"
    )
  })
  rows <- rows[!vapply(rows, is.null, logical(1L))]
  rows <- rows[order(abs(vapply(rows, function(x) x$contribution, numeric(1L))), decreasing = TRUE)]
  head(rows, limit)
}

old_wd <- getwd()
on.exit(setwd(old_wd), add = TRUE)
setwd(source_dir)

source("settings.R")
list.files(path = "functions", pattern = "\\.R$", full.names = TRUE) |>
  sort() |>
  purrr::walk(source)

prepared <- prepare_data(file_path = "data/data_uzbekistan.xlsx", start_date = start_date)
assign("df", prepared$df, envir = .GlobalEnv)

estimation_source <- "saved_results_rdata"
if (file.exists(saved_results)) {
  loaded_names <- load(saved_results)
  if (!("est_dfm" %in% loaded_names)) {
    stop("Saved results file exists but does not contain est_dfm: ", saved_results)
  }
} else {
  estimation_source <- "fresh_refit"
  est_dfm <- estimate_dfm(prepared$df_grw, blocks = NA, p = 1, max_iter = 200, threshold = 1e-5)
}

pred_dfm <- predict_dfm(prepared$df_grw, est_dfm, months_ahead, lag = 0)
gdp <- postprocess_gdp(pred_dfm)
last_observed_gdp_date <- max(prepared$df$date[!is.na(prepared$df$gdp)])
forecast_rows <- gdp[gdp$date > last_observed_gdp_date, , drop = FALSE]
current <- forecast_rows[1L, , drop = FALSE]

source_history_audit <- source_gdp_history_audit(source_workbook, gdp)
coverage <- coverage_summary(source_workbook)
drivers <- driver_table(est_dfm, prepared, limit = 14L)
robustness_ref <- read_json_if_exists(file.path(repo_root, "docs", "data-bridge", "dfm-2026q2-robustness-review.json"))
gdp_sa_ref <- read_json_if_exists(file.path(repo_root, "docs", "data-bridge", "dfm-gdp-seasonal-adjustment-audit.json"))

recent_gdp <- tail(gdp[format(gdp$date, "%m") %in% c("03", "06", "09", "12"), ], 8L)
recent_gdp_rows <- lapply(seq_len(nrow(recent_gdp)), function(i) {
  list(
    period = quarter_period(recent_gdp$date[[i]]),
    gdp_level = round_clean(recent_gdp$gdp_lev[[i]], 1),
    yoy_pct = round_clean(recent_gdp$gdp_grw_yoy[[i]]),
    qoq_pct = round_clean(recent_gdp$gdp_grw_qoq[[i]])
  )
})

payload <- list(
  artifact = list(
    id = "dfm-source-output-review",
    generated_at = utc_now(),
    source_folder = portable_review_path(source_dir),
    source_workbook = portable_review_path(source_workbook),
    source_workbook_md5 = hash_file(source_workbook),
    saved_results = if (file.exists(saved_results)) portable_review_path(saved_results) else NA_character_,
    runner = "scripts/dfm/export-source-output-review.R",
    r_version = paste(R.version$major, R.version$minor, sep = "."),
    public_export_updated = FALSE
  ),
  model_output = list(
    status = "review_only_not_public_export",
    estimation_source = estimation_source,
    converged = identical(est_dfm$convergence, 1),
    iterations = est_dfm$num_iter,
    loglik = round_clean(est_dfm$loglik, 6),
    factor_count = est_dfm$p,
    variable_count = length(est_dfm$model),
    last_observed_gdp_date = as.character(last_observed_gdp_date),
    nowcast_period = quarter_period(current$date[[1L]]),
    gdp_growth_yoy_pct = round_clean(current$gdp_grw_yoy[[1L]]),
    gdp_growth_qoq_pct = round_clean(current$gdp_grw_qoq[[1L]]),
    gdp_level = round_clean(current$gdp_lev[[1L]], 1)
  ),
  source_gdp_history_audit = source_history_audit,
  coverage = coverage,
  recent_gdp_path = recent_gdp_rows,
  top_standardized_factor_drivers = drivers,
  robustness_reference = list(
    status = if (is.null(robustness_ref)) "not_available" else "available",
    json_artifact = "docs/data-bridge/dfm-2026q2-robustness-review.json",
    markdown_report = "docs/data-bridge/dfm-2026q2-robustness-review.md",
    baseline_yoy_pct = robustness_ref$baseline$gdp_growth_yoy_pct %||% NA_real_,
    no_gdp_sa_diff_pp = robustness_ref$sensitivity[[1L]]$yoy_difference_vs_baseline_pp %||% NA_real_
  ),
  gdp_seasonal_adjustment_reference = list(
    status = if (is.null(gdp_sa_ref)) "not_available" else "available",
    json_artifact = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.json",
    markdown_report = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md",
    decision = gdp_sa_ref$recommendation$decision %||% NA_character_
  ),
  reviewer_verdict = list(
    status = "usable_for_internal_model_review_not_public_release",
    critical = as.list(c(
      "This artifact is generated from the external 2026 source folder and must not be treated as the public dfm.json contract.",
      "Source-workbook GDP history is audit-only because workbook source metadata and series continuity are not verified; the seasonally adjusted GDP path is model input only."
    )),
    warnings = as.list(c(
      "Saved EM results are reused when output/results.RData is present; rerun with a clean refit before final model-owner sign-off.",
      "Top drivers are standardized factor signals, not GDP percentage-point contributions.",
      "Transformation caveats remain open for growth, rate, index, and survey rows."
    ))
  )
)

driver_rows <- lapply(head(drivers, 10L), function(row) {
  list(
    id = row$variable_id,
    contribution = row$contribution,
    loading = row$loading,
    latest = row$latest_level_value,
    date = row$latest_level_date,
    direction = row$direction
  )
})

md <- paste(
  "# DFM source output review",
  "",
  paste0("Generated: ", payload$artifact$generated_at),
  "",
  "## Headline",
  "",
  paste0(
    "Review-only source output gives ",
    payload$model_output$nowcast_period,
    " GDP YoY nowcast of ",
    payload$model_output$gdp_growth_yoy_pct,
    "% and QoQ of ",
    payload$model_output$gdp_growth_qoq_pct,
    "%."
  ),
  "",
  paste0(
    "Estimation source: ",
    payload$model_output$estimation_source,
    "; converged: ",
    payload$model_output$converged,
    "; iterations: ",
    payload$model_output$iterations,
    "."
  ),
  "",
  "This artifact is for internal review only. It does not update `apps/policy-ui/public/data/dfm.json`.",
  "",
  "## Source-history guardrail",
  "",
  paste0(
    "Latest observed raw GDP period is ",
    source_history_audit$latest_observed_period,
    ": raw YoY ",
    source_history_audit$raw_gdp_growth_yoy_pct,
    "% versus seasonally adjusted model-input YoY ",
    source_history_audit$model_adjusted_gdp_growth_yoy_pct,
    "%."
  ),
  "",
  "Source-workbook GDP history is audit-only and blocked from public display pending provenance and continuity verification. Seasonally adjusted GDP remains model input only.",
  "",
  "## Recent GDP path",
  "",
  md_table(recent_gdp_rows, c("period", "gdp_level", "yoy_pct", "qoq_pct")),
  "",
  "## Top standardized factor drivers",
  "",
  "These are not GDP percentage-point contributions.",
  "",
  md_table(driver_rows, c("id", "contribution", "loading", "latest", "date", "direction")),
  "",
  "## Review verdict",
  "",
  paste0("Status: ", payload$reviewer_verdict$status),
  "",
  "Critical:",
  paste0("- ", unlist(payload$reviewer_verdict$critical), collapse = "\n"),
  "",
  "Warnings:",
  paste0("- ", unlist(payload$reviewer_verdict$warnings), collapse = "\n"),
  "",
  "Related artifacts:",
  "- `docs/data-bridge/dfm-2026q2-robustness-review.md`",
  "- `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md`",
  "",
  sep = "\n"
)

dir.create(dirname(output_json), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(payload, output_json, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)
while (length(md) > 0L && !nzchar(tail(md, 1L))) md <- head(md, -1L)
writeLines(md, output_md, useBytes = TRUE)

message("[dfm:source-output] wrote ", output_json)
message("[dfm:source-output] wrote ", output_md)
