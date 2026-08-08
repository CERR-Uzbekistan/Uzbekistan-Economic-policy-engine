suppressPackageStartupMessages({
  library(jsonlite)
  library(readxl)
  library(lubridate)
})

args <- commandArgs(trailingOnly = TRUE)

repo_root <- getwd()
target_quarter <- "2026Q2"
required_target_months <- 1L

read_arg <- function(prefix, default = NULL) {
  match <- args[startsWith(args, prefix)]
  if (length(match) == 0L) return(default)
  sub(prefix, "", match[[1L]], fixed = TRUE)
}

if (length(args) >= 1L && !startsWith(args[[1L]], "--")) {
  repo_root <- args[[1L]]
}
target_quarter <- read_arg("--target-quarter=", target_quarter)
required_target_months <- as.integer(read_arg("--required-target-months=", as.character(required_target_months)))
if (is.na(required_target_months) || required_target_months < 1L || required_target_months > 3L) {
  stop("--required-target-months must be 1, 2, or 3")
}

repo_root <- normalizePath(repo_root, winslash = "/", mustWork = TRUE)
source_workbook <- file.path(repo_root, "model sources", "Fore+Nowcast", "DFM", "data", "data_uzbekistan.xlsx")
output_json <- file.path(repo_root, "docs", "data-bridge", "dfm-source-coverage.json")
output_md <- file.path(repo_root, "docs", "data-bridge", "dfm-source-coverage.md")

if (!file.exists(source_workbook)) {
  stop("DFM source workbook is not available: ", source_workbook)
}

utc_now <- function() format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

quarter_start <- function(period) {
  match <- regexec("^(\\d{4})Q([1-4])$", period)
  parts <- regmatches(period, match)[[1L]]
  if (length(parts) != 3L) stop("Unsupported target quarter: ", period)
  year <- as.integer(parts[[2L]])
  q <- as.integer(parts[[3L]])
  as.Date(sprintf("%04d-%02d-01", year, (q - 1L) * 3L + 1L))
}

quarter_label <- function(date) {
  sprintf("%04dQ%d", year(date), quarter(date))
}

previous_quarter_start <- function(date) {
  seq(date, length.out = 2L, by = "-3 months")[[2L]]
}

target_month_cutoff <- function(date, months_required) {
  seq(date, length.out = months_required, by = "1 month")[[months_required]]
}

as_date <- function(value) {
  if (inherits(value, "Date")) return(value)
  if (inherits(value, "POSIXt")) return(as.Date(value))
  as.Date(value)
}

last_non_missing_date <- function(data, date_col, value_col) {
  values <- data[[value_col]]
  dates <- as_date(data[[date_col]])
  keep <- !is.na(dates) & !is.na(values) & values != ""
  if (!any(keep)) return(NA)
  max(dates[keep])
}

non_missing_count <- function(data, value_col) {
  values <- data[[value_col]]
  sum(!is.na(values) & values != "")
}

automation_channel <- function(source, macrobond_key) {
  source_text <- tolower(trimws(ifelse(is.na(source), "", source)))
  key <- trimws(ifelse(is.na(macrobond_key), "", macrobond_key))
  if (grepl("cerr", source_text)) return("internal_cerr_feed_required")
  if (nzchar(key)) return("licensed_macrobond_or_equivalent_export")
  if (grepl("central bank", source_text)) return("official_cbu_feed_required")
  if (grepl("statistics agency", source_text)) return("official_statistics_feed_required")
  if (grepl("kazakh", source_text)) return("foreign_official_feed_required")
  if (!nzchar(source_text)) return("owner_supplied_target_or_manual_source")
  "manual_source_mapping_required"
}

read_source <- function() {
  meta <- suppressMessages(read_excel(source_workbook, sheet = "Series Information"))
  quarterly <- suppressMessages(read_excel(source_workbook, sheet = "Request Quarterly", skip = 2))
  monthly <- suppressMessages(read_excel(source_workbook, sheet = "Request Monthly", skip = 3))
  names(quarterly)[[1L]] <- "date"
  names(monthly)[[1L]] <- "date"
  quarterly$date <- as_date(quarterly$date)
  monthly$date <- as_date(monthly$date)
  list(meta = meta, quarterly = quarterly, monthly = monthly)
}

source <- read_source()
meta <- source$meta
quarterly <- source$quarterly
monthly <- source$monthly

target_start <- quarter_start(target_quarter)
required_gdp_start <- previous_quarter_start(target_start)
required_month_start <- target_month_cutoff(target_start, required_target_months)

variables <- list()
for (row_index in seq_len(nrow(meta))) {
  row <- meta[row_index, ]
  variable_id <- as.character(row[["Code key"]])
  frequency <- as.character(row[["Frequency"]])
  source_table <- if (identical(frequency, "Quarterly")) quarterly else monthly
  source_column <- if (identical(frequency, "Quarterly")) row_index + 1L else row_index
  if (source_column > ncol(source_table)) {
    last_date <- NA
    obs_count <- 0L
  } else {
    last_date <- last_non_missing_date(source_table, "date", names(source_table)[[source_column]])
    obs_count <- non_missing_count(source_table, names(source_table)[[source_column]])
  }
  required_date <- if (identical(frequency, "Quarterly")) required_gdp_start else required_month_start
  coverage_ready <- !is.na(last_date) && last_date >= required_date
  variables[[length(variables) + 1L]] <- list(
    variable_id = variable_id,
    label = as.character(row[["Series description"]]),
    category = as.character(row[["Category"]]),
    frequency = tolower(frequency),
    unit = as.character(row[["Unit"]]),
    source = as.character(row[["Source"]]),
    macrobond_key = as.character(row[["Macrobond key"]]),
    last_observation_date = if (is.na(last_date)) NA_character_ else as.character(last_date),
    observation_count = as.integer(obs_count),
    required_for_target_date = as.character(required_date),
    coverage_ready = coverage_ready,
    automation_channel = automation_channel(row[["Source"]], row[["Macrobond key"]])
  )
}

monthly_variables <- variables[vapply(variables, function(x) identical(x$frequency, "monthly") || identical(x$frequency, "weekly"), logical(1))]
target_variable <- variables[[1L]]
monthly_ready <- sum(vapply(monthly_variables, function(x) isTRUE(x$coverage_ready), logical(1)))
monthly_total <- length(monthly_variables)
monthly_ready_share <- if (monthly_total == 0L) 0 else monthly_ready / monthly_total
gdp_ready <- isTRUE(target_variable$coverage_ready)
q2_ready <- gdp_ready && monthly_ready_share >= 0.8

channel_counts <- table(vapply(variables, function(x) x$automation_channel, character(1)))
channel_count_list <- as.list(as.integer(channel_counts))
names(channel_count_list) <- names(channel_counts)
missing_variables <- variables[!vapply(variables, function(x) isTRUE(x$coverage_ready), logical(1))]

coverage <- list(
  artifact = list(
    id = "dfm-source-coverage",
    generated_at = utc_now(),
    source_workbook = "model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx",
    target_quarter = target_quarter,
    required_target_months = required_target_months
  ),
  readiness = list(
    status = if (q2_ready) "ready_for_target_nowcast_refit" else "not_ready_for_target_nowcast_refit",
    target_quarter = target_quarter,
    required_previous_gdp_quarter = quarter_label(required_gdp_start),
    required_previous_gdp_date = as.character(required_gdp_start),
    required_monthly_data_through = as.character(required_month_start),
    previous_gdp_ready = gdp_ready,
    monthly_ready_count = monthly_ready,
    monthly_total_count = monthly_total,
    monthly_ready_share = round(monthly_ready_share, 4),
    publish_gate = if (q2_ready) {
      "The source workbook has enough GDP and high-frequency coverage for the configured target nowcast refit."
    } else {
      "Do not publish a DFM target-quarter nowcast from this source bundle until the missing GDP/monthly coverage is filled."
    }
  ),
  automation = list(
    channel_counts = channel_count_list,
    required_pipeline = c(
      "Refresh or ingest quarterly real GDP target in 2021 constant prices.",
      "Refresh monthly indicators in the Request Monthly panel through the configured target-quarter month.",
      "Run scripts/dfm/export-canonical.mjs and require source/public reconciliation before public DFM publication.",
      "Replace Overview static nowcast only after the accepted DFM artifact carries the target quarter."
    )
  ),
  variables = variables,
  missing_for_target = missing_variables
)

dir.create(dirname(output_json), recursive = TRUE, showWarnings = FALSE)
write_json(coverage, output_json, auto_unbox = TRUE, pretty = TRUE, na = "null", digits = NA)

md_lines <- c(
  "# DFM source coverage",
  "",
  paste0("Generated: ", coverage$artifact$generated_at),
  "",
  paste0("- Target quarter: ", target_quarter),
  paste0("- Required previous GDP quarter: ", coverage$readiness$required_previous_gdp_quarter),
  paste0("- Required monthly data through: ", coverage$readiness$required_monthly_data_through),
  paste0("- Previous GDP ready: ", coverage$readiness$previous_gdp_ready),
  paste0("- Monthly ready: ", monthly_ready, "/", monthly_total, " (", round(monthly_ready_share * 100, 1), "%)"),
  paste0("- Status: ", coverage$readiness$status),
  "",
  "## Missing for target",
  "",
  "| Variable | Frequency | Last observation | Required date | Automation channel |",
  "|---|---|---:|---:|---|"
)

if (length(missing_variables) == 0L) {
  md_lines <- c(md_lines, "| none |  |  |  |  |")
} else {
  for (item in missing_variables) {
    md_lines <- c(
      md_lines,
      paste0(
        "| `", item$variable_id, "` | ",
        item$frequency, " | ",
        ifelse(is.na(item$last_observation_date), "n/a", item$last_observation_date), " | ",
        item$required_for_target_date, " | ",
        item$automation_channel, " |"
      )
    )
  }
}

md_lines <- c(
  md_lines,
  "",
  "## Automation channels",
  "",
  "| Channel | Series count |",
  "|---|---:|"
)

for (channel in names(channel_counts)) {
  md_lines <- c(md_lines, paste0("| ", channel, " | ", as.integer(channel_counts[[channel]]), " |"))
}

writeLines(md_lines, output_md, useBytes = TRUE)
message("[dfm:coverage] wrote ", output_json)
message("[dfm:coverage] wrote ", output_md)

if (!q2_ready && "--require-ready" %in% args) {
  quit(status = 1L)
}
