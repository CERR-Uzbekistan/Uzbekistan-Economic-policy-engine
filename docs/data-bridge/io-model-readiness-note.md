# Uzbekistan I-O Model Readiness Note

**Date:** 2026-05-22  
**Scope:** Scenario Lab I-O Sector Shock, I-O public artifact, I-O Model Explorer entry.

## Model Form

The Scenario Lab I-O lane uses the static Leontief demand model:

```text
r = (I - A)^-1 f
```

Where:

- `r` is the sector total-resource requirement vector.
- `A` is the technical-coefficient matrix. In the current public artifact each coefficient records intermediate input requirement per unit of total resources (`domestic output + imports`).
- `I` is the identity matrix.
- `L = (I - A)^-1` is the Leontief inverse. It converts a final-demand vector into direct plus indirect total-resource requirements.
- `f` is the final-demand shock vector allocated by selected final-demand shares, total-resource shares, or one selected sector.

Value-added and employment exposure are computed after the total-resource response:

```text
va_i = GVA_i / total_resources_i
emp_i = EMP_i / total_resources_i
dVA_i = va_i * dr_i
dEMP_i = emp_i * dr_i
```

Employment effects are fixed-intensity exposure estimates, not labor-market forecasts.

## Current Data

- Source: Statistics Agency under the President of Uzbekistan, `Uzbekistan Input-Output Table 2022`.
- Checked-in source artifacts: `io_model/io_data.json` and `io_model/io_data.js`.
- Public UI artifact: `apps/policy-ui/public/data/io.json`.
- Base year: 2022.
- Sector count: 136.
- Units: source monetary arrays are retained in the legacy bridge scale; Scenario Lab displays shock results in billion UZS.
- Sector-code assumptions: source sector codes are preserved. Broad sector groups are derived only from the leading code letter (`A` agriculture, `B-E` industry, `F` construction, `G-H` trade/transport, `O-Q` public/social, remaining coded services as services). Tradable and upstream/downstream tags remain explicit nulls until a reviewed source or rule is accepted.
- Sector labels: source Russian labels are displayed in the Scenario Lab. The sector dictionary also carries available EN/RU/UZ labels from the tracked I-O JavaScript source, but those labels are not treated as official translations in the current UI.

## What The Model Can Answer

- Short-run sector total-resource transmission from a final-demand shock.
- Direct plus indirect sector multiplier effects under fixed 2022 input coefficients.
- Value-added accounting effects using fixed sector value-added coefficients.
- Employment-intensity exposure using fixed employment coefficients.
- Sensitivity of the sector story to allocation mode, employment intensity, import leakage, and FX conversion assumptions.

## What The Model Cannot Answer

- Prices, inflation, margins, or cost pass-through.
- Substitution between inputs, domestic/import sourcing, or capacity constraints.
- Fiscal feedback, revenue dynamics, or debt paths.
- External balance, current-account effects, or exchange-rate feedback.
- Welfare, distributional effects, or CGE/general-equilibrium adjustment.
- Forecast probabilities or uncertainty bands.

## Validation Trail

Implemented checks in `apps/policy-ui/src/data/bridge/io-audit.ts` and related tests cover:

- Leontief inverse exists and is a finite square matrix.
- Sector output, total resources, final demand, import, employment, and sector dictionary arrays align by sector code/order.
- Impossible negative fields are absent for technical coefficients, output, imports, value added, multipliers, and employment. Inventory final demand may be negative.
- Baseline reconstruction uses `L * final_demand` against total resources where the source data support that identity.
- 1 bln UZS shocks scale proportionally within rounding tolerance.
- Sector rankings are deterministic.
- Sensitivity outputs cover allocation modes, employment intensity, import leakage, and FX conversion.

## References

- United Nations, *Handbook on Supply and Use Tables and Input-Output Tables with Extensions and Applications*: https://www.un-ilibrary.org/content/books/9789213582794
- Eurostat, *Manual of Supply, Use and Input-Output Tables*: https://ec.europa.eu/eurostat/web/products-manuals-and-guidelines/-/ks-ra-07-013
- OECD, *Development of the OECD Inter-Country Input-Output Database 2023*: https://doi.org/10.1787/5a5d0665-en
