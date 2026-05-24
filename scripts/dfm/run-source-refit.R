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
repo_root <- if (length(args) >= 1L) args[[1L]] else getwd()
repo_root <- normalizePath(repo_root, winslash = "/", mustWork = TRUE)

source_dir <- file.path(repo_root, "model sources", "Fore+Nowcast", "DFM")
source_workbook <- file.path(source_dir, "data", "data_uzbekistan.xlsx")
output_path <- file.path(repo_root, "docs", "data-bridge", "dfm-source-refit-summary.json")
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

capture_warnings <- function(expr, warning_store) {
  withCallingHandlers(
    expr,
    warning = function(w) {
      warning_store[[length(warning_store) + 1L]] <<- conditionMessage(w)
      invokeRestart("muffleWarning")
    }
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

last_observed_gdp_date <- max(df$date[!is.na(df$gdp)])
forecast_rows <- gdp[gdp$date > last_observed_gdp_date, , drop = FALSE]
current_source <- if (nrow(forecast_rows) > 0L) forecast_rows[1L, , drop = FALSE] else NULL
public_current <- latest_public_nowcast(public_artifact_path)

current_period <- if (is.null(current_source)) NA_character_ else {
  sprintf(
    "%sQ%s",
    lubridate::year(current_source$date[[1L]]),
    lubridate::quarter(current_source$date[[1L]])
  )
}

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
    source_folder = "model sources/Fore+Nowcast/DFM",
    source_workbook = "model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx",
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
  warnings = warnings_output,
  limitations = c(
    "This runner proves the local source workbook and R estimator can execute without the PDF report step.",
    "The public dfm.json export still publishes the frozen dfm_nowcast/dfm_data.js bridge until source-refit output is reconciled and signed off.",
    "True vintage backtesting still requires historical source-workbook vintages or saved pre-release DFM outputs."
  )
)

dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(summary, output_path, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)
message("[dfm:source-refit] wrote ", output_path)
