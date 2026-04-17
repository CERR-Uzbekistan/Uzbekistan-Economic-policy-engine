"""MCP tool definitions and registration for all 6 economic models + knowledge hub pipelines."""

from __future__ import annotations


def register_tools(mcp, get_io_data, get_pe_data, get_dfm_data, shared_dir: str = ""):
    """Register all MCP tools with the server."""

    # ─── list_models ──────────────────────────────────────────────────────

    @mcp.tool()
    async def list_models() -> dict:
        """List all available Uzbekistan economic policy models with descriptions.

        Returns information about 6 macroeconomic models: QPM (monetary policy),
        DFM (GDP nowcasting), PE (trade impact), I-O (sector multipliers),
        CGE (general equilibrium), and FPP (fiscal programming).
        """
        return {
            "models": [
                {
                    "id": "qpm",
                    "name": "Quarterly Projection Model (QPM)",
                    "type": "New-Keynesian DSGE",
                    "description": (
                        "Simulates monetary policy transmission via IS curve, Phillips curve, "
                        "Taylor rule, and UIP. Produces impulse response functions for demand, "
                        "cost-push, exchange rate, and monetary shocks."
                    ),
                    "tools": ["qpm_impulse_response", "qpm_baseline_forecast"],
                    "key_outputs": [
                        "output_gap", "inflation_yoy", "policy_rate", "ner_depreciation"
                    ],
                },
                {
                    "id": "dfm",
                    "name": "Dynamic Factor Model (DFM Nowcast)",
                    "type": "Kalman Filter / State-Space",
                    "description": (
                        "Real-time GDP nowcasting using 35 monthly indicators and Kalman filter. "
                        "Produces point estimates with confidence bands and news decomposition."
                    ),
                    "tools": ["dfm_nowcast", "dfm_kalman_update"],
                    "key_outputs": ["gdp_nowcast_yoy", "confidence_bands", "news_decomposition"],
                    "data_required": True,
                },
                {
                    "id": "pe",
                    "name": "Partial Equilibrium (PE / WITS-SMART)",
                    "type": "Trade Policy Simulation",
                    "description": (
                        "WTO accession trade impact analysis. Simulates tariff cut effects on "
                        "trade creation, trade diversion, consumer welfare, and government revenue "
                        "across 19 HS sections and 59 partner countries."
                    ),
                    "tools": ["pe_trade_impact", "pe_trade_overview"],
                    "key_outputs": [
                        "trade_creation", "trade_diversion", "welfare_effect", "revenue_change"
                    ],
                    "data_required": True,
                },
                {
                    "id": "io",
                    "name": "Input-Output Model (Leontief)",
                    "type": "136-Sector Supply Chain",
                    "description": (
                        "2022 Uzbekistan symmetric I-O table. Computes output, value-added, and "
                        "employment multipliers. Simulates demand shocks and cost-push price "
                        "propagation across 136 NACE sectors."
                    ),
                    "tools": ["io_demand_shock", "io_sector_info"],
                    "key_outputs": [
                        "output_multiplier", "va_multiplier", "employment_effect",
                        "sector_impacts", "linkage_classification"
                    ],
                    "data_required": True,
                },
                {
                    "id": "cge",
                    "name": "CGE 1-2-3 Model",
                    "type": "Computable General Equilibrium",
                    "description": (
                        "Devarajan-Go 1-2-3 CGE with CET export supply, CES Armington imports, "
                        "and BoP closure. Simulates tariff, tax, fiscal, and external shocks "
                        "on the whole economy. Calibrated to 2021 Uzbekistan SAM."
                    ),
                    "tools": ["cge_simulate"],
                    "key_outputs": [
                        "exchange_rate", "gdp", "exports", "imports", "trade_balance",
                        "consumption", "investment", "fiscal_balance"
                    ],
                },
                {
                    "id": "fpp",
                    "name": "Financial Programming & Policies (FPP)",
                    "type": "IMF 4-Sector Framework",
                    "description": (
                        "Macroeconomic programming framework with real, external, fiscal, and "
                        "monetary sectors. Projects 2025-2027 with consistency checks across "
                        "BOP, fiscal balance, and growth accounting."
                    ),
                    "tools": ["fpp_project"],
                    "key_outputs": [
                        "gdp_growth", "inflation", "fiscal_balance", "current_account",
                        "reserves", "consistency_checks"
                    ],
                },
            ],
            "total_tools": 19,
            "knowledge_hub_tools": [
                "fetch_academic_papers", "curate_academic_papers", "update_literature_data",
                "fetch_policy_reforms", "categorize_policy_reform", "update_tracker_data",
                "save_research_article",
            ],
            "data_sources": [
                "Statistics Agency of Uzbekistan",
                "Central Bank of Uzbekistan",
                "WITS (World Integrated Trade Solution)",
                "CAEM (Central Asian Economic Model)",
            ],
        }

    # ─── QPM Tools ────────────────────────────────────────────────────────

    @mcp.tool()
    async def qpm_impulse_response(
        shock_type: str,
        shock_size: float = 1.0,
        horizon: int = 20,
        b1: float = 0.70,
        b2: float = 0.20,
        b3: float = 0.30,
        b4: float = 0.60,
        a1: float = 0.60,
        a2: float = 0.20,
        a3: float = 0.65,
        g1: float = 0.80,
        g2: float = 1.50,
        g3: float = 0.50,
        e1: float = 0.70,
        inflation_target: float = 5.0,
        neutral_real_rate: float = 3.5,
        potential_growth: float = 6.0,
    ) -> dict:
        """Run a QPM impulse response simulation for Uzbekistan monetary policy.

        Simulates how the economy responds to a one-time shock using a New-Keynesian
        DSGE model with IS curve, Phillips curve, Taylor rule, and UIP equation.

        Args:
            shock_type: Type of shock. One of: "demand" (aggregate demand),
                "cost_push" (cost-push inflation), "depreciation" (UZS depreciation),
                "monetary" (monetary policy tightening).
            shock_size: Shock magnitude in percentage points (0.25 to 5.0).
            horizon: Forecast horizon in quarters (8 to 32).
            b1: IS curve — output gap persistence (0.3 to 0.95).
            b2: IS curve — MCI sensitivity (0.05 to 0.6).
            b3: IS curve — external demand (0.05 to 0.6).
            b4: MCI — interest rate vs exchange rate weight (0.1 to 0.9).
            a1: Phillips curve — inflation persistence (0.3 to 0.9).
            a2: Phillips curve — marginal cost pass-through (0.05 to 0.5).
            a3: Phillips curve — domestic cost share (0.2 to 0.9).
            g1: Taylor rule — interest rate smoothing (0.3 to 0.95).
            g2: Taylor rule — inflation response (1.0 to 3.0, >1 = Taylor principle).
            g3: Taylor rule — output gap response (0.1 to 1.5).
            e1: UIP — backward-looking exchange rate weight (0.1 to 0.9).
            inflation_target: Central bank inflation target (%).
            neutral_real_rate: Neutral real interest rate (%).
            potential_growth: Potential GDP growth rate (%).
        """
        from helpers.validation import validate_qpm_params
        from models.qpm import solve_irf

        valid_types = ("demand", "cost_push", "depreciation", "monetary")
        if shock_type not in valid_types:
            return {"error": f"Invalid shock_type. Must be one of: {valid_types}"}

        params = validate_qpm_params(locals())
        shock_size = max(0.25, min(5.0, shock_size))
        horizon = max(8, min(32, horizon))

        return solve_irf(params, shock_type, shock_size, horizon)

    @mcp.tool()
    async def qpm_baseline_forecast(
        initial_inflation_yoy: float = 10.5,
        initial_policy_rate: float = 13.5,
        initial_output_gap: float = -1.5,
        initial_ner_depreciation: float = 8.0,
        horizon: int = 16,
        b1: float = 0.70,
        b2: float = 0.20,
        a1: float = 0.60,
        a2: float = 0.20,
        a3: float = 0.65,
        g1: float = 0.80,
        g2: float = 1.50,
        g3: float = 0.50,
        inflation_target: float = 5.0,
        neutral_real_rate: float = 3.5,
        potential_growth: float = 6.0,
    ) -> dict:
        """Generate a QPM baseline macroeconomic forecast for Uzbekistan.

        Projects inflation, policy rate, output gap, and NER depreciation forward
        from current conditions using simplified QPM dynamics.

        Args:
            initial_inflation_yoy: Current CPI inflation YoY (%).
            initial_policy_rate: Current CBU policy rate (%).
            initial_output_gap: Current output gap (%).
            initial_ner_depreciation: Current NER depreciation YoY (%).
            horizon: Forecast horizon in quarters (4 to 32).
            b1: IS curve — output gap persistence.
            b2: IS curve — MCI sensitivity.
            a1: Phillips curve — inflation persistence.
            a2: Phillips curve — marginal cost pass-through.
            a3: Phillips curve — domestic cost share.
            g1: Taylor rule — smoothing.
            g2: Taylor rule — inflation response.
            g3: Taylor rule — output gap response.
            inflation_target: Central bank target (%).
            neutral_real_rate: Neutral real rate (%).
            potential_growth: Potential GDP growth (%).
        """
        from helpers.validation import validate_qpm_params
        from models.qpm import run_baseline

        params = validate_qpm_params(locals())
        return run_baseline(
            params,
            initial_inflation_yoy=initial_inflation_yoy,
            initial_policy_rate=initial_policy_rate,
            initial_output_gap=initial_output_gap,
            initial_ner_depreciation=initial_ner_depreciation,
            horizon=max(4, min(32, horizon)),
        )

    # ─── CGE Tools ────────────────────────────────────────────────────────

    @mcp.tool()
    async def cge_simulate(
        import_tariff_pct: float = 2.0,
        export_tax_pct: float = 0.0,
        sales_tax_pct: float = 6.0,
        income_tax_pct: float = 3.0,
        savings_rate_pct: float = 38.0,
        govt_spending: float = 0.18,
        world_import_price: float = 0.98,
        world_export_price: float = 1.00,
        foreign_borrowing: float = 0.04,
        remittances: float = 0.14,
        foreign_transfers: float = 0.00,
        total_output: float = 1.00,
        productivity_factor: float = 1.00,
    ) -> dict:
        """Run a CGE 1-2-3 general equilibrium simulation for Uzbekistan.

        Devarajan-Go model with CET export supply, CES Armington imports, and
        BoP closure via flexible exchange rate. Calibrated to 2021 Uzbekistan SAM.

        Args:
            import_tariff_pct: Import tariff rate (%). Base: 2%.
            export_tax_pct: Export tax rate (%). Base: 0%.
            sales_tax_pct: Sales/VAT tax rate (%). Base: 6%.
            income_tax_pct: Income tax rate (%). Base: 3%.
            savings_rate_pct: Household savings rate (%). Base: 38%.
            govt_spending: Government consumption (base=0.18, share of GDP).
            world_import_price: World import price index (base=0.98).
            world_export_price: World export price index (base=1.00).
            foreign_borrowing: Foreign borrowing (base=0.04).
            remittances: Remittance inflows (base=0.14).
            foreign_transfers: Foreign aid transfers (base=0.00).
            total_output: Total domestic output (base=1.00).
            productivity_factor: TFP factor (base=1.00).
        """
        from models.cge import solve_cge

        params = {
            "tm": import_tariff_pct / 100.0,
            "te": export_tax_pct / 100.0,
            "ts": sales_tax_pct / 100.0,
            "ty": income_tax_pct / 100.0,
            "sy": savings_rate_pct / 100.0,
            "G": govt_spending,
            "wm": world_import_price,
            "we": world_export_price,
            "B": foreign_borrowing,
            "re": remittances,
            "ft": foreign_transfers,
            "X": total_output,
            "Pf": productivity_factor,
            "tr": -0.04,  # fixed net transfers
        }
        return solve_cge(params)

    # ─── FPP Tools ────────────────────────────────────────────────────────

    @mcp.tool()
    async def fpp_project(
        gdp_growth_2025: float = 6.0,
        gdp_growth_2026: float = 5.8,
        gdp_growth_2027: float = 5.5,
        inflation_2025: float = 9.0,
        inflation_2026: float = 7.5,
        inflation_2027: float = 6.0,
        policy_rate_2025: float = 13.5,
        policy_rate_2026: float = 12.0,
        policy_rate_2027: float = 10.0,
        ner_depreciation_2025: float = 5.0,
        ner_depreciation_2026: float = 4.0,
        ner_depreciation_2027: float = 3.0,
        fiscal_balance_pct_gdp_2025: float = -3.0,
        fiscal_balance_pct_gdp_2026: float = -2.5,
        fiscal_balance_pct_gdp_2027: float = -2.0,
        current_account_pct_gdp_2025: float = -5.0,
        current_account_pct_gdp_2026: float = -4.0,
        current_account_pct_gdp_2027: float = -3.5,
    ) -> dict:
        """Run 3-year macroeconomic projections using IMF Financial Programming framework.

        Projects Uzbekistan's real, external, fiscal, and monetary sectors for 2025-2027
        with consistency checks across all four sectors.

        Args:
            gdp_growth_2025: Real GDP growth (%) for 2025.
            gdp_growth_2026: Real GDP growth (%) for 2026.
            gdp_growth_2027: Real GDP growth (%) for 2027.
            inflation_2025: CPI inflation (%) for 2025.
            inflation_2026: CPI inflation (%) for 2026.
            inflation_2027: CPI inflation (%) for 2027.
            policy_rate_2025: CBU policy rate (%) for 2025.
            policy_rate_2026: CBU policy rate (%) for 2026.
            policy_rate_2027: CBU policy rate (%) for 2027.
            ner_depreciation_2025: NER depreciation (%) for 2025.
            ner_depreciation_2026: NER depreciation (%) for 2026.
            ner_depreciation_2027: NER depreciation (%) for 2027.
            fiscal_balance_pct_gdp_2025: Fiscal balance (% GDP) for 2025.
            fiscal_balance_pct_gdp_2026: Fiscal balance (% GDP) for 2026.
            fiscal_balance_pct_gdp_2027: Fiscal balance (% GDP) for 2027.
            current_account_pct_gdp_2025: Current account balance (% GDP) for 2025.
            current_account_pct_gdp_2026: Current account balance (% GDP) for 2026.
            current_account_pct_gdp_2027: Current account balance (% GDP) for 2027.
        """
        from models.fpp import solve_fpp

        years = []
        for year, suffix in [(2025, "2025"), (2026, "2026"), (2027, "2027")]:
            years.append({
                "year": year,
                "g": locals()[f"gdp_growth_{suffix}"],
                "inf": locals()[f"inflation_{suffix}"],
                "pr": locals()[f"policy_rate_{suffix}"],
                "ner_dep": locals()[f"ner_depreciation_{suffix}"],
                "fiscal_bal": locals()[f"fiscal_balance_pct_gdp_{suffix}"],
                "ca": locals()[f"current_account_pct_gdp_{suffix}"],
            })
        return solve_fpp(years)

    # ─── I-O Tools ────────────────────────────────────────────────────────

    @mcp.tool()
    async def io_demand_shock(
        consumption_shock_bln_uzs: float = 0.0,
        government_shock_bln_uzs: float = 0.0,
        investment_shock_bln_uzs: float = 0.0,
        export_shock_bln_uzs: float = 0.0,
        distribution: str = "output",
        sector_code: str | None = None,
    ) -> dict:
        """Simulate a demand shock through Uzbekistan's 136-sector I-O model.

        Uses the 2022 Leontief inverse matrix to propagate final demand changes
        through the entire supply chain, computing output, value-added, and
        employment effects.

        Args:
            consumption_shock_bln_uzs: Household consumption shock (billion UZS).
            government_shock_bln_uzs: Government spending shock (billion UZS).
            investment_shock_bln_uzs: Investment (GFCF) shock (billion UZS).
            export_shock_bln_uzs: Export shock (billion UZS).
            distribution: How to distribute aggregate shock across sectors.
                "output" = by output share, "gva" = by GVA share, "equal" = equally.
            sector_code: If specified, apply entire shock to this single sector
                (e.g. "C29" for motor vehicles). Overrides distribution.
        """
        data = get_io_data()
        if data is None:
            return {"error": "I-O data not loaded. Run convert_js_data.py first."}

        from models.io_model import run_demand_shock

        return run_demand_shock(
            data,
            consumption=consumption_shock_bln_uzs,
            government=government_shock_bln_uzs,
            investment=investment_shock_bln_uzs,
            exports=export_shock_bln_uzs,
            distribution=distribution,
            sector_code=sector_code,
        )

    @mcp.tool()
    async def io_sector_info(
        sector_code: str | None = None,
        classification: str | None = None,
        top_n: int = 20,
    ) -> dict:
        """Get sector multipliers and linkage classification for Uzbekistan's I-O model.

        Args:
            sector_code: Specific NACE sector code (e.g. "A01.11", "C29"). If None, returns top_n.
            classification: Filter by Rasmussen linkage type: "key", "backward", "forward", "weak".
            top_n: Number of sectors to return (default 20, max 136).
        """
        data = get_io_data()
        if data is None:
            return {"error": "I-O data not loaded. Run convert_js_data.py first."}

        from models.io_model import get_sector_info

        return get_sector_info(data, sector_code=sector_code, classification=classification, top_n=top_n)

    # ─── PE Tools ─────────────────────────────────────────────────────────

    @mcp.tool()
    async def pe_trade_impact(
        tariff_cut_pct: float = 20.0,
        regime: str = "all",
        hs_section: str = "all",
        country: str = "all",
    ) -> dict:
        """Simulate WTO tariff cut trade impact on Uzbekistan using WITS-SMART model.

        Calculates trade creation, trade diversion, consumer welfare, and
        government revenue effects of tariff reductions.

        Args:
            tariff_cut_pct: Percentage reduction in tariffs (5 to 100).
            regime: Trade regime filter: "all", "mfn" (MFN partners only),
                "fta" (FTA/CIS partners), "full" (duty-free partners).
            hs_section: HS section to analyze (e.g. "I", "XVI") or "all".
            country: Partner country name or "all".
        """
        data = get_pe_data()
        if data is None:
            return {"error": "PE data not loaded. Run convert_js_data.py first."}

        from models.pe import run_trade_simulation

        return run_trade_simulation(
            data,
            tariff_cut_pct=max(5.0, min(100.0, tariff_cut_pct)),
            regime=regime,
            hs_section=hs_section,
            country=country,
        )

    @mcp.tool()
    async def pe_trade_overview() -> dict:
        """Get summary trade statistics for Uzbekistan (no scenario simulation).

        Returns aggregate import values, tariff rates, top trading partners,
        top sections by import value, and high-tariff products.
        """
        data = get_pe_data()
        if data is None:
            return {"error": "PE data not loaded. Run convert_js_data.py first."}

        from models.pe import get_trade_overview

        return get_trade_overview(data)

    # ─── DFM Tools ────────────────────────────────────────────────────────

    @mcp.tool()
    async def dfm_nowcast() -> dict:
        """Get the latest GDP nowcast for Uzbekistan using the Dynamic Factor Model.

        Uses a Kalman filter with 35 monthly indicators to produce real-time
        GDP growth estimates with confidence bands and factor contribution analysis.
        """
        data = get_dfm_data()
        if data is None:
            return {"error": "DFM data not loaded. Run convert_js_data.py first."}

        from models.dfm import run_nowcast

        return run_nowcast(data)

    @mcp.tool()
    async def dfm_kalman_update(
        observations: dict,
    ) -> dict:
        """Update the GDP nowcast with new monthly indicator observations.

        Runs one Kalman filter step to incorporate newly released data,
        computing the revised GDP estimate and news decomposition.

        Args:
            observations: Dict of indicator observations as month-on-month percent
                changes. Keys are indicator names (from the DFM variable list),
                values are the new data points. Only include newly released indicators.
                Example: {"industrial_production": 3.2, "retail_sales": 5.1}
        """
        data = get_dfm_data()
        if data is None:
            return {"error": "DFM data not loaded. Run convert_js_data.py first."}

        from models.dfm import run_kalman_update

        return run_kalman_update(data, observations)

    # ─── Cross-Model Tools ────────────────────────────────────────────────

    @mcp.tool()
    async def scenario_compare(
        scenarios: list[dict],
    ) -> dict:
        """Run multiple economic scenarios and compare results side-by-side.

        Each scenario specifies a model and its parameters. Returns a comparison
        table with key performance indicators aligned across scenarios.

        Args:
            scenarios: List of 2-4 scenario dicts. Each must have a "model" key
                (one of "qpm", "cge", "fpp") and the model-specific parameters.
                Example: [
                    {"model": "qpm", "shock_type": "demand", "shock_size": 1.0},
                    {"model": "qpm", "shock_type": "demand", "shock_size": 2.0}
                ]
        """
        from models.qpm import solve_irf as qpm_solve
        from models.cge import solve_cge as cge_solve
        from models.fpp import solve_fpp as fpp_solve
        from helpers.validation import validate_qpm_params, CGE_DEFAULTS

        if not scenarios or len(scenarios) < 2:
            return {"error": "Provide at least 2 scenarios to compare."}
        if len(scenarios) > 4:
            return {"error": "Maximum 4 scenarios for comparison."}

        results = []
        for i, sc in enumerate(scenarios):
            model = sc.get("model", "").lower()
            label = sc.get("label", f"Scenario {i + 1}")

            if model == "qpm":
                params = validate_qpm_params(sc)
                shock_type = sc.get("shock_type", "demand")
                shock_size = float(sc.get("shock_size", 1.0))
                horizon = int(sc.get("horizon", 20))
                res = qpm_solve(params, shock_type, shock_size, horizon)
                results.append({"label": label, "model": "QPM", "result": res})

            elif model == "cge":
                cge_params = dict(CGE_DEFAULTS)
                for k in CGE_DEFAULTS:
                    if k in sc:
                        cge_params[k] = float(sc[k])
                res = cge_solve(cge_params)
                results.append({"label": label, "model": "CGE", "result": res})

            elif model == "fpp":
                years = sc.get("years", [])
                res = fpp_solve(years)
                results.append({"label": label, "model": "FPP", "result": res})

            else:
                results.append({"label": label, "model": model, "result": {"error": f"Unknown model: {model}"}})

        return {"comparison": results, "n_scenarios": len(results)}

    # ─── Knowledge Hub: Literature Pipeline ───────────────────────────────

    @mcp.tool()
    async def fetch_academic_papers(
        model_id: str = "all",
        keywords: str | None = None,
        max_results: int = 20,
    ) -> dict:
        """Fetch candidate academic papers from Semantic Scholar and OpenAlex APIs.

        Searches for papers relevant to Uzbekistan's economic models using
        model-specific keywords or custom queries.

        Args:
            model_id: Model to search for ("qpm", "dfm", "cge", "io", "pe", "fpp", or "all").
            keywords: Custom search keywords. If None, uses built-in model-specific keywords.
            max_results: Maximum papers to return per query (5 to 50).
        """
        from tools.literature import fetch_papers
        return await fetch_papers(model_id=model_id, keywords=keywords, max_results=max_results)

    @mcp.tool()
    async def curate_academic_papers(
        candidates: list[dict],
        model_id: str,
        api_key: str | None = None,
    ) -> dict:
        """Score and curate candidate papers for relevance using AI.

        Takes papers from fetch_academic_papers and scores them 0-10 for relevance
        to the specified economic model. Papers scoring >= 6 are accepted with
        trilingual relevance notes (EN/RU/UZ).

        Args:
            candidates: List of paper dicts from fetch_academic_papers.
            model_id: Model context for relevance scoring (qpm, dfm, cge, io, pe, fpp).
            api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.
        """
        from tools.literature import curate_papers
        return await curate_papers(candidates=candidates, model_id=model_id, api_key=api_key)

    @mcp.tool()
    async def update_literature_data(
        new_papers: list[dict],
    ) -> dict:
        """Merge new curated papers into shared/literature-data.js.

        Deduplicates by DOI and title, preserves existing papers, and updates
        the lastUpdated timestamp.

        Args:
            new_papers: List of curated paper dicts from curate_academic_papers.
        """
        from tools.literature import update_literature_file
        return await update_literature_file(new_papers=new_papers, shared_dir=shared_dir)

    # ─── Knowledge Hub: Reform Pipeline ───────────────────────────────────

    @mcp.tool()
    async def fetch_policy_reforms(
        source: str = "all",
        limit: int = 20,
    ) -> dict:
        """Fetch recent policy reforms from Uzbekistan government sources.

        Checks lex.uz (government gazette), CBU announcements, and WTO working
        party documents for new decrees, resolutions, and policy decisions.

        Args:
            source: Source to query — "lex_uz", "cbu", "wto", or "all".
            limit: Maximum documents to return per source (5 to 50).
        """
        from tools.reforms import fetch_reforms
        return await fetch_reforms(source=source, limit=limit)

    @mcp.tool()
    async def categorize_policy_reform(
        raw_text: str,
        source: str = "lex_uz",
        api_key: str | None = None,
    ) -> dict:
        """Categorize and summarize a government document using AI.

        Classifies the document by category, sector, region, and document type,
        generates trilingual summaries, and links to relevant economic models.

        Args:
            raw_text: Raw text content of the government document.
            source: Origin of the document ("lex_uz", "cbu", "wto").
            api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.
        """
        from tools.reforms import categorize_reform
        return await categorize_reform(raw_text=raw_text, source=source, api_key=api_key)

    @mcp.tool()
    async def update_tracker_data(
        new_reforms: list[dict],
    ) -> dict:
        """Merge new categorized reforms into shared/policy-tracker-data.js.

        Deduplicates by title, appends new entries, and updates the
        lastUpdated timestamp.

        Args:
            new_reforms: List of reform entry dicts from categorize_policy_reform.
        """
        from tools.reforms import update_tracker_file
        return await update_tracker_file(new_reforms=new_reforms, shared_dir=shared_dir)

    # ─── Knowledge Hub: Research Articles ─────────────────────────────────

    @mcp.tool()
    async def save_research_article(
        title_en: str,
        title_ru: str = "",
        title_uz: str = "",
        author: str = "CERR Research Team",
        model: str = "",
        topics: list[str] | None = None,
        abstract_en: str = "",
        abstract_ru: str = "",
        abstract_uz: str = "",
        body_en: str = "",
        body_ru: str = "",
        body_uz: str = "",
    ) -> dict:
        """Save a research article or policy brief to shared/research-data.js.

        Used by the AI Advisor "Publish as Brief" button and for manual article
        creation. Generates a unique ID and appends to the entries array.

        Args:
            title_en: Article title in English (required).
            title_ru: Article title in Russian.
            title_uz: Article title in Uzbek.
            author: Author name or team.
            model: Linked model ID (qpm, dfm, cge, io, pe, fpp) or empty.
            topics: Topic tags from: trade, monetary, fiscal, growth, inflation, structural.
            abstract_en: Short abstract in English.
            abstract_ru: Short abstract in Russian.
            abstract_uz: Short abstract in Uzbek.
            body_en: Full article body in English.
            body_ru: Full article body in Russian.
            body_uz: Full article body in Uzbek.
        """
        from tools.research import save_research_article as _save
        return await _save(
            title_en=title_en, title_ru=title_ru, title_uz=title_uz,
            author=author, model=model, topics=topics,
            abstract_en=abstract_en, abstract_ru=abstract_ru, abstract_uz=abstract_uz,
            body_en=body_en, body_ru=body_ru, body_uz=body_uz,
            shared_dir=shared_dir,
        )
