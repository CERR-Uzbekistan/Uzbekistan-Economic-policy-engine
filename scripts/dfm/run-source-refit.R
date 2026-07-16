# Refit the audited local DFM source bundle without rendering the PDF report.
#
# The source main.R renders a PDF before saving results. On machines without
# Pandoc, the model can estimate successfully but main.R stops at report render.
# This runner executes the same data prep, EM estimation, prediction, and GDP
# postprocessing steps, then writes a compact audit artifact that is safe to
# commit. It does not commit or copy raw source workbooks/model objects.

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
source_dir_arg <- sub("^--source-dir=", "", args[grepl("^--source-dir=", args)][1L])
output_arg <- sub("^--output=", "", args[grepl("^--output=", args)][1L])

repo_root <- if (length(positional_args) >= 1L) positional_args[[1L]] else getwd()
repo_root <- normalizePath(repo_root, winslash = "/", mustWork = TRUE)

source_dir_env <- Sys.getenv("DFM_SOURCE_DIR", unset = NA_character_)
source_dir_override <- if (!is.na(source_dir_arg) && nzchar(source_dir_arg)) {
  source_dir_arg
} else if (!is.na(source_dir_env) && nzchar(source_dir_env)) {
  source_dir_env
} else {
  NA_character_
}

source_dir <- if (is.na(source_dir_override)) {
  file.path(repo_root, "model sources", "Fore+Nowcast", "DFM")
} else {
  source_dir_override
}
source_dir <- normalizePath(source_dir, winslash = "/", mustWork = FALSE)
source_workbook <- file.path(source_dir, "data", "data_uzbekistan.xlsx")
output_env <- Sys.getenv("DFM_REFIT_OUTPUT", unset = NA_character_)
output_path <- if (!is.na(output_arg) && nzchar(output_arg)) {
  output_arg
} else if (!is.na(output_env) && nzchar(output_env)) {
  output_env
} else {
  file.path(repo_root, "docs", "data-bridge", "dfm-source-refit-summary.json")
}
output_path <- normalizePath(output_path, winslash = "/", mustWork = FALSE)
public_artifact_path <- file.path(repo_root, "apps", "policy-ui", "public", "data", "dfm.json")

if (!dir.exists(source_dir)) {
  stop("DFM source folder is not available: ", source_dir)
}
if (!file.exists(source_workbook)) {
  stop("DFM source workbook is not available: ", source_workbook)
}

hash_file <- function(path) {
  if (!file.exists(path)) return(NA_character_)
  unname(as.character(tools::md5sum(path)))
}

utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

round_clean <- function(value, digits = 4) {
  rounded <- round(value, digits)
  if (is.na(rounded)) return(NA_real_)
  if (abs(rounded) < 10^(-digits)) return(0)
  rounded
}

display_path <- function(path) {
  normalized <- normalizePath(path, winslash = "/", mustWork = FALSE)
  repo_prefix <- paste0(repo_root, "/")
  if (startsWith(normalized, repo_prefix)) {
    return(substring(normalized, nchar(repo_prefix) + 1L))
  }
  normalized
}

quarter_period <- function(date) {
  if (is.na(date)) return(NA_character_)
  sprintf("%sQ%s", lubridate::year(date), lubridate::quarter(date))
}

capture_warnings <- function(expr, warning_store) {
  withCallingHandlers(
    expr,
    warning = function(w) {
      warning_store[[length(warning_store) + 1L]] <<- conditionMessage(w)
      invokeRestart("muffleWarning")
    }
  )
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

latest_public_nowcast <- function(path) {
  if (!file.exists(path)) return(NULL)
  payload <- jsonlite::fromJSON(path, simplifyVector = FALSE)
  current <- payload$nowcast$current_quarter
  if (is.null(current)) return(NULL)
  list(
    period = current$period,
    gdp_growth_yoy_pct = current$gdp_growth_yoy_pct,
    gdp_growth_qoq_pct = current$gdp_growth_qoq_pct
  )
}

start_time <- Sys.time()
warnings_seen <- list()

old_wd <- getwd()
on.exit(setwd(old_wd), add = TRUE)
setwd(source_dir)

source("settings.R")
list.files(path = "functions", pattern = "\\.R$", full.names = TRUE) |>
  sort() |>
  purrr::walk(source)

max_iter <- as.integer(Sys.getenv("DFM_MAX_ITER", "200"))
threshold <- as.numeric(Sys.getenv("DFM_THRESHOLD", "1e-5"))

res <- capture_warnings(
  prepare_data(file_path = "data/data_uzbekistan.xlsx", start_date = start_date),
  warnings_seen
)
meta <- res$meta
df <- res$df
df_grw <- res$df_grw

blocks <- matrix(1, nrow = ncol(df) - 1, ncol = n_f)
est_dfm <- estimate_dfm(df_grw, blocks = NA, p = 1, max_iter = max_iter, threshold = threshold)
pred_dfm <- predict_dfm(df_grw, est_dfm, months_ahead, lag = 0)
gdp <- postprocess_gdp(pred_dfm)
source_gdp_history <- source_gdp_history_audit(source_workbook, gdp)

last_observed_gdp_date <- max(df$date[!is.na(df$gdp)])
forecast_rows <- gdp[gdp$date > last_observed_gdp_date, , drop = FALSE]
current_source <- if (nrow(forecast_rows) > 0L) forecast_rows[1L, , drop = FALSE] else NULL
public_current <- latest_public_nowcast(public_artifact_path)

current_period <- if (is.null(current_source)) NA_character_ else quarter_period(current_source$date[[1L]])

source_yoy <- if (is.null(current_source)) NA_real_ else current_source$gdp_grw_yoy[[1L]]
source_qoq <- if (is.null(current_source)) NA_real_ else current_source$gdp_grw_qoq[[1L]]
public_yoy <- if (is.null(public_current)) NA_real_ else public_current$gdp_growth_yoy_pct

elapsed <- as.numeric(difftime(Sys.time(), start_time, units = "secs"))
warnings_vector <- unique(as.character(unlist(warnings_seen, use.names = FALSE)))
warnings_output <- if (length(warnings_vector) == 0L) list() else as.list(warnings_vector)

summary <- list(
  artifact = list(
    id = "dfm-source-refit-summary",
    generated_at = utc_now(),
    status = "completed_without_pdf_report",
    source_folder = display_path(source_dir),
    source_workbook = display_path(source_workbook),
    source_workbook_md5 = hash_file(source_workbook),
    runner = "scripts/dfm/run-source-refit.R",
    r_version = paste(R.version$major, R.version$minor, sep = "."),
    elapsed_seconds = round(elapsed, 2)
  ),
  runtime = list(
    start_date = start_date,
    n_factors = n_f,
    months_ahead = months_ahead,
    max_iter = max_iter,
    threshold = threshold,
    pandoc_available = rmarkdown::pandoc_available(),
    report_render_status = if (rmarkdown::pandoc_available()) {
      "skipped_by_runner"
    } else {
      "skipped_by_runner_pandoc_not_available"
    },
    package_versions = list(
      readxl = as.character(packageVersion("readxl")),
      dplyr = as.character(packageVersion("dplyr")),
      pracma = as.character(packageVersion("pracma")),
      Matrix = as.character(packageVersion("Matrix")),
      zoo = as.character(packageVersion("zoo")),
      purrr = as.character(packageVersion("purrr")),
      lubridate = as.character(packageVersion("lubridate")),
      tidyr = as.character(packageVersion("tidyr")),
      signal = as.character(packageVersion("signal")),
      seasonal = as.character(packageVersion("seasonal")),
      urca = as.character(packageVersion("urca")),
      ggplot2 = as.character(packageVersion("ggplot2"))
    )
  ),
  data = list(
    level_rows = nrow(df),
    growth_rows = nrow(df_grw),
    variable_count = ncol(df) - 1L,
    growth_variable_count = ncol(df_grw) - 1L,
    first_growth_date = as.character(min(df_grw$date)),
    last_growth_date = as.character(max(df_grw$date)),
    last_observed_gdp_date = as.character(last_observed_gdp_date)
  ),
  estimation = list(
    status = "completed",
    converged = identical(est_dfm$convergence, 1),
    convergence_code = est_dfm$convergence,
    iterations = est_dfm$num_iter,
    loglik = round(est_dfm$loglik, 6),
    model_variable_count = est_dfm$num_vars,
    state_dimension = ncol(est_dfm$Z)
  ),
  current_nowcast = list(
    source_period = current_period,
    source_series_basis = "seasonally_adjusted_model_input_and_projection",
    source_gdp_growth_yoy_pct = if (is.na(source_yoy)) NA_real_ else round_clean(source_yoy),
    source_gdp_growth_qoq_pct = if (is.na(source_qoq)) NA_real_ else round_clean(source_qoq),
    public_period = if (is.null(public_current)) NA_character_ else public_current$period,
    public_gdp_growth_yoy_pct = if (is.na(public_yoy)) NA_real_ else round_clean(public_yoy),
    yoy_difference_source_minus_public_pp = if (is.na(source_yoy) || is.na(public_yoy)) {
      NA_real_
    } else {
      round_clean(source_yoy - public_yoy)
    }
  ),
  source_gdp_history_audit = source_gdp_history,
  warnings = warnings_output,
  limitations = c(
    "This runner proves the local source workbook and R estimator can execute without the PDF report step.",
    "Source-workbook GDP history remains audit-only until source provenance and series continuity are verified; seasonally adjusted GDP levels are model inputs, not official releases.",
    "The public dfm.json export still publishes the frozen dfm_nowcast/dfm_data.js bridge until source-refit output is reconciled and signed off.",
    "True vintage backtesting still requires historical source-workbook vintages or saved pre-release DFM outputs."
  )
)

dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(summary, output_path, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)
message("[dfm:source-refit] wrote ", output_path)
