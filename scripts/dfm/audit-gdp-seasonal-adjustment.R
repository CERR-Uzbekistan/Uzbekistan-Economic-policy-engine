# Audit source-workbook GDP history versus the seasonally adjusted GDP series used
# by the DFM source workflow. This does not publish or refit dfm.json.

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
output_json <- normalizePath(
  arg_value(
    "output-json",
    file.path(repo_root, "docs", "data-bridge", "dfm-gdp-seasonal-adjustment-audit.json")
  ),
  winslash = "/",
  mustWork = FALSE
)
output_md <- normalizePath(
  arg_value(
    "output-md",
    file.path(repo_root, "docs", "data-bridge", "dfm-gdp-seasonal-adjustment-audit.md")
  ),
  winslash = "/",
  mustWork = FALSE
)

if (!dir.exists(source_dir)) stop("DFM source folder is not available: ", source_dir)
if (!file.exists(source_workbook)) stop("DFM source workbook is not available: ", source_workbook)

`%||%` <- function(a, b) if (is.null(a)) b else a
utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
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

quarter_period <- function(date) sprintf("%sQ%s", lubridate::year(date), lubridate::quarter(date))

add_growth <- function(data, level_col, yoy_name, qoq_name) {
  data[[yoy_name]] <- NA_real_
  data[[qoq_name]] <- NA_real_
  for (i in seq_len(nrow(data))) {
    if (i > 1L && !is.na(data[[level_col]][[i]]) && !is.na(data[[level_col]][[i - 1L]])) {
      data[[qoq_name]][[i]] <- (data[[level_col]][[i]] / data[[level_col]][[i - 1L]] - 1) * 100
    }
    if (i > 4L && !is.na(data[[level_col]][[i]]) && !is.na(data[[level_col]][[i - 4L]])) {
      data[[yoy_name]][[i]] <- (data[[level_col]][[i]] / data[[level_col]][[i - 4L]] - 1) * 100
    }
  }
  data
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

raw_quarterly <- suppressMessages(readxl::read_excel(source_workbook, sheet = "Request Quarterly"))
raw <- data.frame(
  date = as.Date(raw_quarterly[[1L]]) %m+% months(2),
  raw_gdp_level = suppressWarnings(as.numeric(raw_quarterly[[2L]]))
)
raw <- raw[!is.na(raw$date) & !is.na(raw$raw_gdp_level), , drop = FALSE]
raw <- add_growth(raw, "raw_gdp_level", "raw_gdp_yoy_pct", "raw_gdp_qoq_pct")

prepared <- prepare_data(file_path = "data/data_uzbekistan.xlsx", start_date = start_date)
adjusted <- prepared$df[format(prepared$df$date, "%m") %in% c("03", "06", "09", "12"), c("date", "gdp")]
names(adjusted) <- c("date", "adjusted_gdp_level")
adjusted <- adjusted[!is.na(adjusted$adjusted_gdp_level), , drop = FALSE]
adjusted <- add_growth(adjusted, "adjusted_gdp_level", "adjusted_gdp_yoy_pct", "adjusted_gdp_qoq_pct")

aligned <- merge(raw, adjusted, by = "date", all.x = TRUE, sort = TRUE)
aligned$period <- vapply(aligned$date, quarter_period, character(1L))
aligned$quarter <- paste0("Q", lubridate::quarter(aligned$date))
aligned$adjusted_minus_raw_yoy_pp <- aligned$adjusted_gdp_yoy_pct - aligned$raw_gdp_yoy_pct
aligned$adjusted_minus_raw_qoq_pp <- aligned$adjusted_gdp_qoq_pct - aligned$raw_gdp_qoq_pct
aligned$raw_to_adjusted_ratio <- aligned$raw_gdp_level / aligned$adjusted_gdp_level

latest <- tail(aligned[!is.na(aligned$raw_gdp_yoy_pct), , drop = FALSE], 1L)
recent <- tail(aligned[!is.na(aligned$raw_gdp_yoy_pct), , drop = FALSE], 8L)
recent_rows <- lapply(seq_len(nrow(recent)), function(i) {
  row <- recent[i, , drop = FALSE]
  list(
    period = row$period[[1L]],
    raw_yoy_pct = round_clean(row$raw_gdp_yoy_pct[[1L]]),
    adjusted_yoy_pct = round_clean(row$adjusted_gdp_yoy_pct[[1L]]),
    yoy_gap_pp = round_clean(row$adjusted_minus_raw_yoy_pp[[1L]]),
    raw_qoq_pct = round_clean(row$raw_gdp_qoq_pct[[1L]]),
    adjusted_qoq_pct = round_clean(row$adjusted_gdp_qoq_pct[[1L]]),
    qoq_gap_pp = round_clean(row$adjusted_minus_raw_qoq_pp[[1L]]),
    raw_to_adjusted_ratio = round_clean(row$raw_to_adjusted_ratio[[1L]], 4)
  )
})

seasonal_by_quarter <- aligned |>
  dplyr::filter(!is.na(raw_to_adjusted_ratio)) |>
  dplyr::group_by(quarter) |>
  dplyr::summarise(
    mean_raw_to_adjusted_ratio = mean(raw_to_adjusted_ratio, na.rm = TRUE),
    mean_raw_qoq_pct = mean(raw_gdp_qoq_pct, na.rm = TRUE),
    mean_adjusted_qoq_pct = mean(adjusted_gdp_qoq_pct, na.rm = TRUE),
    observations = dplyr::n(),
    .groups = "drop"
  ) |>
  dplyr::arrange(quarter)
seasonal_rows <- lapply(seq_len(nrow(seasonal_by_quarter)), function(i) {
  row <- seasonal_by_quarter[i, , drop = FALSE]
  list(
    quarter = row$quarter[[1L]],
    mean_raw_to_adjusted_ratio = round_clean(row$mean_raw_to_adjusted_ratio[[1L]], 4),
    mean_raw_qoq_pct = round_clean(row$mean_raw_qoq_pct[[1L]]),
    mean_adjusted_qoq_pct = round_clean(row$mean_adjusted_qoq_pct[[1L]]),
    observations = row$observations[[1L]]
  )
})

volatility <- list(
  raw_qoq_sd_pp = round_clean(sd(aligned$raw_gdp_qoq_pct, na.rm = TRUE)),
  adjusted_qoq_sd_pp = round_clean(sd(aligned$adjusted_gdp_qoq_pct, na.rm = TRUE)),
  raw_yoy_sd_pp = round_clean(sd(aligned$raw_gdp_yoy_pct, na.rm = TRUE)),
  adjusted_yoy_sd_pp = round_clean(sd(aligned$adjusted_gdp_yoy_pct, na.rm = TRUE))
)

recommendation <- list(
  decision = "keep_adjusted_gdp_for_model_estimation_and_block_source_history_from_public_display_pending_verification",
  rationale = as.list(c(
    "Raw GDP levels have strong quarter-specific seasonality, especially large Q1 declines and Q2 rebounds, so raw QoQ dynamics are not suitable for the DFM state equation.",
    "Skipping GDP seasonal adjustment changes the 2026Q2 YoY nowcast by more than 3 percentage points, which is a model-risk warning rather than a reason to display adjusted history as official.",
    "The raw source-workbook series may be used only to audit the seasonal-adjustment effect until its provenance and continuity are verified."
  )),
  required_guardrails = as.list(c(
    "Label both raw source-workbook GDP and adjusted model-input GDP as review-only until provenance and continuity checks pass.",
    "Do not publish the no-GDP-seasonal-adjustment sensitivity or raw workbook history as an official series.",
    "Ask the model owner to confirm the X-13 specification and whether GDP should be adjusted by source code or by an official SA series."
  ))
)

payload <- list(
  artifact = list(
    id = "dfm-gdp-seasonal-adjustment-audit",
    generated_at = utc_now(),
    source_folder = portable_review_path(source_dir),
    source_workbook = portable_review_path(source_workbook),
    source_workbook_md5 = hash_file(source_workbook),
    runner = "scripts/dfm/audit-gdp-seasonal-adjustment.R",
    r_version = paste(R.version$major, R.version$minor, sep = ".")
  ),
  latest = list(
    period = latest$period[[1L]],
    raw_gdp_level = round_clean(latest$raw_gdp_level[[1L]], 1),
    adjusted_gdp_level = round_clean(latest$adjusted_gdp_level[[1L]], 1),
    raw_yoy_pct = round_clean(latest$raw_gdp_yoy_pct[[1L]]),
    adjusted_yoy_pct = round_clean(latest$adjusted_gdp_yoy_pct[[1L]]),
    yoy_gap_pp = round_clean(latest$adjusted_minus_raw_yoy_pp[[1L]]),
    raw_qoq_pct = round_clean(latest$raw_gdp_qoq_pct[[1L]]),
    adjusted_qoq_pct = round_clean(latest$adjusted_gdp_qoq_pct[[1L]]),
    qoq_gap_pp = round_clean(latest$adjusted_minus_raw_qoq_pp[[1L]])
  ),
  volatility = volatility,
  seasonal_by_quarter = seasonal_rows,
  recent_quarters = recent_rows,
  recommendation = recommendation,
  limitations = as.list(c(
    "This audit checks GDP seasonal adjustment only; it does not validate every non-GDP transformation.",
    "The source workflow uses automatic X-13 through seasonal::seas(); the exact official seasonal-adjustment convention still needs model-owner confirmation.",
    "The audit does not create a real-time vintage backtest."
  ))
)

md <- paste(
  "# DFM GDP seasonal-adjustment audit",
  "",
  paste0("Generated: ", payload$artifact$generated_at),
  "",
  "## Decision",
  "",
  "Keep seasonally adjusted GDP for model estimation; keep raw source-workbook GDP audit-only until provenance and continuity are verified.",
  "",
  "## Latest observed quarter",
  "",
  paste0(
    payload$latest$period,
    ": raw YoY ",
    payload$latest$raw_yoy_pct,
    "% versus adjusted model-input YoY ",
    payload$latest$adjusted_yoy_pct,
    "%. Gap: ",
    payload$latest$yoy_gap_pp,
    " pp."
  ),
  "",
  paste0(
    "Raw QoQ is ",
    payload$latest$raw_qoq_pct,
    "% versus adjusted QoQ ",
    payload$latest$adjusted_qoq_pct,
    "%. This large raw QoQ seasonal swing is why unadjusted GDP is a poor state-equation input."
  ),
  "",
  "## Volatility",
  "",
  paste0("- Raw QoQ SD: ", volatility$raw_qoq_sd_pp, " pp"),
  paste0("- Adjusted QoQ SD: ", volatility$adjusted_qoq_sd_pp, " pp"),
  paste0("- Raw YoY SD: ", volatility$raw_yoy_sd_pp, " pp"),
  paste0("- Adjusted YoY SD: ", volatility$adjusted_yoy_sd_pp, " pp"),
  "",
  "## Quarter-specific seasonality",
  "",
  md_table(seasonal_rows, c("quarter", "mean_raw_to_adjusted_ratio", "mean_raw_qoq_pct", "mean_adjusted_qoq_pct", "observations")),
  "",
  "## Recent raw versus adjusted GDP history",
  "",
  md_table(recent_rows, c("period", "raw_yoy_pct", "adjusted_yoy_pct", "yoy_gap_pp", "raw_qoq_pct", "adjusted_qoq_pct", "qoq_gap_pp")),
  "",
  "## Required guardrails",
  "",
  paste0("- ", unlist(recommendation$required_guardrails), collapse = "\n"),
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

message("[dfm:gdp-sa] wrote ", output_json)
message("[dfm:gdp-sa] wrote ", output_md)
