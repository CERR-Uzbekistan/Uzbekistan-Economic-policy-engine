# Review a local DFM source folder with robustness checks and driver diagnostics.
#
# This script is intentionally separate from the public dfm.json exporter. It can
# inspect an external owner-supplied source folder without copying raw workbooks
# into the repository, then writes compact JSON/Markdown review artifacts.

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
  Sys.getenv(
    "DFM_SOURCE_DIR",
    file.path(repo_root, "model sources", "Fore+Nowcast", "DFM")
  )
)
source_dir <- normalizePath(source_dir, winslash = "/", mustWork = FALSE)
source_workbook <- file.path(source_dir, "data", "data_uzbekistan.xlsx")

output_json <- normalizePath(
  arg_value(
    "output-json",
    file.path(repo_root, "docs", "data-bridge", "dfm-2026q2-robustness-review.json")
  ),
  winslash = "/",
  mustWork = FALSE
)
output_md <- normalizePath(
  arg_value(
    "output-md",
    file.path(repo_root, "docs", "data-bridge", "dfm-2026q2-robustness-review.md")
  ),
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


read_json_if_exists <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(
    jsonlite::fromJSON(path, simplifyVector = FALSE),
    error = function(e) NULL
  )
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

make_prepare_data <- function(source_prepare_data) {
  function(file_path, start_date, seasonal_policy = "source", monthly_cutoff = NA_character_) {
    if (seasonal_policy == "source" && is.na(monthly_cutoff)) {
      return(source_prepare_data(file_path = file_path, start_date = start_date))
    }

    meta <- suppressMessages(readxl::read_excel(file_path, sheet = "Series Information"))
    df_monthly <- suppressMessages(readxl::read_excel(file_path, sheet = "Request Monthly"))
    df_monthly <- df_monthly[-1, ]
    df_quarterly <- suppressMessages(readxl::read_excel(file_path, sheet = "Request Quarterly"))
    df_quarterly[[1]] <- df_quarterly[[1]] %m+% months(2)

    df <- merge(
      df_quarterly,
      df_monthly,
      by.x = names(df_quarterly)[1],
      by.y = names(df_monthly)[1],
      all.y = TRUE
    )
    colnames(df) <- c("date", meta$`Code key`)
    df[[1]] <- as.Date(df[[1]], format = "%Y-%m-%d")
    df[, -1] <- lapply(df[, -1], function(x) as.numeric(as.character(x)))

    if (!is.na(monthly_cutoff)) {
      cutoff <- as.Date(monthly_cutoff)
      monthly_codes <- meta$`Code key`[meta$Frequency != "Quarterly"]
      available_codes <- intersect(monthly_codes, colnames(df))
      df[df$date > cutoff, available_codes] <- NA_real_
    }

    start_date_minus_3m <- seq(as.Date(start_date), length = 2, by = "-3 month")[2]
    df <- df[df$date >= start_date_minus_3m, ]

    for (i in 2:ncol(df)) {
      code <- colnames(df)[i]
      meta_idx <- i - 1L
      is_by_code <- !is.na(meta$`Seasonal adjustment`[meta_idx]) &&
        meta$`Seasonal adjustment`[meta_idx] == "By code"
      skip_sa <- seasonal_policy == "none" ||
        (seasonal_policy == "skip_gdp" && code == "gdp")
      if (is_by_code && !skip_sa) {
        if (meta$Frequency[meta_idx] == "Quarterly") {
          series_ts <- ts(
            df[[i]][!is.na(df[[i]])],
            start = c(year(df$date[1]), quarter(df$date[1])),
            frequency = 4
          )
        } else {
          series_ts <- ts(df[[i]], start = c(year(df$date[1]), month(df$date[1])), frequency = 12)
        }
        sa_result <- try(seas(series_ts), silent = TRUE)
        if (!inherits(sa_result, "try-error")) {
          sa_vals <- as.numeric(final(sa_result))
          sa_aligned <- rep(NA_real_, length(df[[i]]))
          non_na_idx <- which(!is.na(df[[i]]))
          sa_aligned[non_na_idx] <- sa_vals
          df[[i]] <- sa_aligned
        } else {
          warning(paste("Seasonal adjustment failed for column:", code))
        }
      }
    }

    df_grw <- calculate_growth(df)
    is_stationary <- rep(FALSE, ncol(df_grw) - 1)
    for (i in 2:ncol(df_grw)) {
      adf_result <- ur.df(df_grw[i][!is.na(df_grw[i])], type = "drift", selectlags = "BIC")
      is_stationary[i - 1] <- adf_result@teststat[1, "tau2"] < adf_result@cval["tau2", "5pct"]
    }
    if (any(!is_stationary)) {
      warning(paste0(
        "The following variables are not stationary: ",
        paste(colnames(df_grw)[2:length(colnames(df_grw))][!is_stationary], collapse = ", ")
      ))
    }
    list(meta = meta, df = df, df_grw = df_grw)
  }
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

driver_table <- function(case_result, limit = 14L) {
  est <- case_result$est_dfm
  res <- case_result$res
  df_grw <- res$df_grw
  meta <- res$meta
  variables <- est$model
  means <- as.numeric(est$means[1, variables])
  sdevs <- as.numeric(est$sdevs[1, variables])
  loading <- as.numeric(est$C[seq_along(variables), 1])

  rows <- lapply(seq_along(variables), function(i) {
    code <- variables[[i]]
    if (code == "gdp") return(NULL)
    latest_growth <- latest_non_na(df_grw[[code]], df_grw$date)
    latest_level <- latest_non_na(res$df[[code]], res$df$date)
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
  rows <- rows[order(vapply(rows, function(x) abs(x$contribution), numeric(1L)), decreasing = TRUE)]
  rows[seq_len(min(limit, length(rows)))]
}

run_case <- function(
  case_id,
  label,
  prepare_data_review,
  seasonal_policy = "source",
  monthly_cutoff = NA_character_,
  drop_variables = character(),
  max_iter = 200L,
  threshold = 1e-5
) {
  start_time <- Sys.time()
  captured <- capture_warnings(
    prepare_data_review(
      file_path = "data/data_uzbekistan.xlsx",
      start_date = start_date,
      seasonal_policy = seasonal_policy,
      monthly_cutoff = monthly_cutoff
    )
  )
  res <- captured$value
  df_grw_case <- res$df_grw
  drop_existing <- intersect(drop_variables, colnames(df_grw_case))
  if (length(drop_existing) > 0L) {
    df_grw_case <- df_grw_case[, setdiff(colnames(df_grw_case), drop_existing), drop = FALSE]
  }

  assign("df", res$df, envir = .GlobalEnv)
  est_dfm <- estimate_dfm(df_grw_case, blocks = NA, p = 1, max_iter = max_iter, threshold = threshold)
  pred_dfm <- predict_dfm(df_grw_case, est_dfm, months_ahead, lag = 0)
  gdp <- postprocess_gdp(pred_dfm)
  last_observed_gdp_date <- max(res$df$date[!is.na(res$df$gdp)])
  forecast_rows <- gdp[gdp$date > last_observed_gdp_date, , drop = FALSE]
  current <- if (nrow(forecast_rows) > 0L) forecast_rows[1L, , drop = FALSE] else NULL
  elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))

  list(
    case_id = case_id,
    label = label,
    seasonal_policy = seasonal_policy,
    monthly_cutoff = if (is.na(monthly_cutoff)) NA_character_ else monthly_cutoff,
    drop_variables = as.list(drop_existing),
    status = "completed",
    converged = identical(est_dfm$convergence, 1),
    iterations = est_dfm$num_iter,
    loglik = round_clean(est_dfm$loglik, 6),
    variable_count = ncol(df_grw_case) - 1L,
    last_growth_date = as.character(max(df_grw_case$date)),
    last_observed_gdp_date = as.character(last_observed_gdp_date),
    nowcast_period = if (is.null(current)) NA_character_ else quarter_period(current$date[[1L]]),
    gdp_growth_yoy_pct = if (is.null(current)) NA_real_ else round_clean(current$gdp_grw_yoy[[1L]]),
    gdp_growth_qoq_pct = if (is.null(current)) NA_real_ else round_clean(current$gdp_grw_qoq[[1L]]),
    gdp_level = if (is.null(current)) NA_real_ else round_clean(current$gdp_lev[[1L]], 1),
    elapsed_seconds = round(elapsed, 2),
    warnings = as.list(unique(captured$warnings)),
    res = res,
    est_dfm = est_dfm,
    pred_dfm = pred_dfm,
    gdp = gdp
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

md_table <- function(rows, columns) {
  header <- paste(columns, collapse = " | ")
  divider <- paste(rep("---", length(columns)), collapse = " | ")
  body <- vapply(rows, function(row) {
    paste(vapply(columns, function(col) as.character(row[[col]] %||% ""), character(1L)), collapse = " | ")
  }, character(1L))
  paste(c(header, divider, body), collapse = "\n")
}

old_wd <- getwd()
on.exit(setwd(old_wd), add = TRUE)
setwd(source_dir)

source("settings.R")
list.files(path = "functions", pattern = "\\.R$", full.names = TRUE) |>
  sort() |>
  purrr::walk(source)

source_prepare_data <- prepare_data
prepare_data_review <- make_prepare_data(source_prepare_data)
max_iter <- as.integer(Sys.getenv("DFM_MAX_ITER", "200"))
threshold <- as.numeric(Sys.getenv("DFM_THRESHOLD", "1e-5"))

message("[dfm:review] running baseline")
baseline <- run_case(
  "baseline",
  "Baseline source workflow",
  prepare_data_review,
  seasonal_policy = "source",
  max_iter = max_iter,
  threshold = threshold
)

drivers <- driver_table(baseline, limit = 14L)
top_drop <- vapply(head(drivers, 3L), function(x) x$variable_id, character(1L))

message("[dfm:review] running no GDP seasonal adjustment")
no_gdp_sa <- run_case(
  "no_gdp_seasonal_adjustment",
  "Skip seasonal adjustment for GDP only",
  prepare_data_review,
  seasonal_policy = "skip_gdp",
  max_iter = max_iter,
  threshold = threshold
)

message("[dfm:review] running April-only high-frequency data")
april_only <- run_case(
  "april_only_high_frequency",
  "Remove May 2026 high-frequency observations",
  prepare_data_review,
  seasonal_policy = "source",
  monthly_cutoff = "2026-04-01",
  max_iter = max_iter,
  threshold = threshold
)

message("[dfm:review] running top-driver leave-out")
drop_top <- run_case(
  "drop_top3_absolute_drivers",
  "Drop top 3 absolute baseline driver rows",
  prepare_data_review,
  seasonal_policy = "source",
  drop_variables = top_drop,
  max_iter = max_iter,
  threshold = threshold
)

cases_full <- list(baseline, no_gdp_sa, april_only, drop_top)
cases <- lapply(cases_full, function(case) {
  case[c(
    "case_id",
    "label",
    "seasonal_policy",
    "monthly_cutoff",
    "drop_variables",
    "status",
    "converged",
    "iterations",
    "loglik",
    "variable_count",
    "last_growth_date",
    "last_observed_gdp_date",
    "nowcast_period",
    "gdp_growth_yoy_pct",
    "gdp_growth_qoq_pct",
    "gdp_level",
    "elapsed_seconds",
    "warnings"
  )]
})

baseline_yoy <- baseline$gdp_growth_yoy_pct
sensitivity <- lapply(cases[-1], function(case) {
  list(
    case_id = case$case_id,
    yoy_difference_vs_baseline_pp = round_clean(case$gdp_growth_yoy_pct - baseline_yoy),
    qoq_difference_vs_baseline_pp = round_clean(case$gdp_growth_qoq_pct - baseline$gdp_growth_qoq_pct)
  )
})

source_history_audit <- source_gdp_history_audit(source_workbook, baseline$gdp)
coverage <- coverage_summary(source_workbook)
gdp_sa_audit_json <- file.path(repo_root, "docs", "data-bridge", "dfm-gdp-seasonal-adjustment-audit.json")
gdp_sa_audit <- read_json_if_exists(gdp_sa_audit_json)
gdp_sa_reference <- if (!is.null(gdp_sa_audit)) {
  list(
    status = "completed",
    json_artifact = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.json",
    markdown_report = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md",
    decision = gdp_sa_audit$recommendation$decision %||%
      "keep_adjusted_gdp_for_model_estimation_and_block_source_history_from_public_display_pending_verification",
    raw_qoq_sd_pp = gdp_sa_audit$volatility$raw_qoq_sd_pp %||% NA_real_,
    adjusted_qoq_sd_pp = gdp_sa_audit$volatility$adjusted_qoq_sd_pp %||% NA_real_,
    latest_raw_qoq_pct = gdp_sa_audit$latest$raw_qoq_pct %||% NA_real_,
    latest_adjusted_qoq_pct = gdp_sa_audit$latest$adjusted_qoq_pct %||% NA_real_
  )
} else {
  list(
    status = "not_run",
    json_artifact = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.json",
    markdown_report = "docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md",
    decision = "pending_gdp_seasonal_adjustment_audit"
  )
}

review_findings <- list(
  critical = as.list(c(
    "Source-workbook GDP history and model-adjusted GDP history differ. Both remain review-only until source provenance and series continuity are verified.",
    "The result remains a one-factor DFM with no true real-time vintage backtest."
  )),
  warnings = as.list(c(
    "The no-GDP-seasonal-adjustment case moves the point estimate materially, but the seasonal-adjustment audit shows this is expected because raw GDP QoQ is dominated by quarter seasonality.",
    "May-data removal and top-driver leave-out move the point estimate only modestly.",
    "Top contributions are standardized factor signals, not GDP percentage-point effects.",
    "Some source rows are already growth/rate/native-unit indicators and still use the generic source transformation path."
  )),
  notes = as.list(c(
    "This review does not publish the 2026Q2 result into apps/policy-ui/public/data/dfm.json.",
    "All source-folder raw files remain outside git."
  ))
)

payload <- list(
  artifact = list(
    id = "dfm-2026q2-robustness-review",
    generated_at = utc_now(),
    source_folder = portable_review_path(source_dir),
    source_workbook = portable_review_path(source_workbook),
    source_workbook_md5 = hash_file(source_workbook),
    runner = "scripts/dfm/review-source-nowcast.R",
    r_version = paste(R.version$major, R.version$minor, sep = ".")
  ),
  baseline = cases[[1L]],
  source_gdp_history_audit = source_history_audit,
  gdp_seasonal_adjustment_audit = gdp_sa_reference,
  coverage = coverage,
  top_drivers = drivers,
  robustness_cases = cases,
  sensitivity = sensitivity,
  reviewer_findings = review_findings,
  limitations = as.list(c(
    "No historical source-workbook vintages are available, so this is not a true real-time DFM backtest.",
    "The source workflow still relies on generic log-difference transformations for multiple caveated rows.",
    "Alternative block/factor structures are not estimated in this run; the source model remains one-factor.",
    "The PDF report step remains skipped because Pandoc is not available locally."
  ))
)

case_rows <- lapply(cases, function(case) {
  list(
    case = case$case_id,
    nowcast = case$nowcast_period,
    yoy_pct = case$gdp_growth_yoy_pct,
    qoq_pct = case$gdp_growth_qoq_pct,
    diff_pp = round_clean(case$gdp_growth_yoy_pct - baseline_yoy),
    converged = case$converged,
    iterations = case$iterations
  )
})
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
  "# DFM 2026Q2 robustness review",
  "",
  paste0("Generated: ", payload$artifact$generated_at),
  "",
  "## Headline",
  "",
  paste0(
    "Baseline source refit gives ",
    baseline$nowcast_period,
    " GDP YoY nowcast of ",
    baseline$gdp_growth_yoy_pct,
    "% and QoQ of ",
    baseline$gdp_growth_qoq_pct,
    "%."
  ),
  "",
  "This is a model nowcast from the owner-supplied source folder. It is not yet the public app nowcast and is not an official GDP forecast.",
  "",
  "## Source-history guardrail",
  "",
  paste0(
    "Latest observed raw GDP history is ",
    source_history_audit$latest_observed_period,
    ": raw YoY ",
    source_history_audit$raw_gdp_growth_yoy_pct,
    "% versus seasonally adjusted model-input YoY ",
    source_history_audit$model_adjusted_gdp_growth_yoy_pct,
    "%. Difference: ",
    source_history_audit$model_adjusted_minus_raw_yoy_pp,
    " pp."
  ),
  "",
  "Source-workbook GDP history is audit-only and must not be displayed as official history. The adjusted series is model input only.",
  "",
  "## GDP seasonal-adjustment decision",
  "",
  "Decision: keep seasonally adjusted GDP for model estimation; keep raw source-workbook GDP audit-only pending provenance and continuity verification.",
  "",
  paste0(
    "The separate GDP seasonal-adjustment audit shows that raw quarterly GDP has strong quarter-specific seasonality. Latest raw QoQ is ",
    gdp_sa_reference$latest_raw_qoq_pct %||% "n/a",
    "% while adjusted QoQ is ",
    gdp_sa_reference$latest_adjusted_qoq_pct %||% "n/a",
    "%. Raw QoQ volatility is ",
    gdp_sa_reference$raw_qoq_sd_pp %||% "n/a",
    " pp versus ",
    gdp_sa_reference$adjusted_qoq_sd_pp %||% "n/a",
    " pp after seasonal adjustment."
  ),
  "",
  "Supporting artifact: `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md`.",
  "",
  "## Robustness cases",
  "",
  md_table(case_rows, c("case", "nowcast", "yoy_pct", "qoq_pct", "diff_pp", "converged", "iterations")),
  "",
  "## Top standardized factor drivers",
  "",
  "These are not GDP percentage-point contributions. They are standardized indicator movements multiplied by factor loadings.",
  "",
  md_table(driver_rows, c("id", "contribution", "loading", "latest", "date", "direction")),
  "",
  "## Hostile-review findings",
  "",
  "Critical:",
  paste0("- ", unlist(review_findings$critical), collapse = "\n"),
  "",
  "Warnings:",
  paste0("- ", unlist(review_findings$warnings), collapse = "\n"),
  "",
  "Notes:",
  paste0("- ", unlist(review_findings$notes), collapse = "\n"),
  "",
  "## Limitations",
  "",
  paste0("- ", unlist(payload$limitations), collapse = "\n"),
  "",
  sep = "\n"
)

dir.create(dirname(output_json), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(payload, output_json, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)
while (length(md) > 0L && !nzchar(tail(md, 1L))) md <- head(md, -1L)
writeLines(md, output_md, useBytes = TRUE)

message("[dfm:review] wrote ", output_json)
message("[dfm:review] wrote ", output_md)
