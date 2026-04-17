/* ═══════════════════════════════════════════════════════════════
   Shared Synthesis Engines
   Reusable cross-model shock computations. All engines read from
   window.EPE.registry. The Synthesis page uses these directly;
   individual models can optionally wrap them to expose a consistent
   cross-model run API.

   Each engine takes (shockSpec, registry) and returns a flat object
   of KPIs including a `gdp_impact_pct` key so the reconciliation
   table can compare them.
   ═══════════════════════════════════════════════════════════════ */
(function () {

  function runPE(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const chapters = Object.keys(reg.trade_elasticities.by_hs_chapter);
    const elast = chapters.map(c => reg.trade_elasticities.by_hs_chapter[c].import_demand);
    const avgElast = elast.reduce((a, b) => a + b, 0) / elast.length;
    const importChg = avgElast * t;
    const importShareGDP = 0.028;
    const tradeDivertedPctGDP = Math.abs(importChg) * importShareGDP;
    return {
      import_volume_chg_pct: importChg * 100,
      trade_diverted_bln_usd: tradeDivertedPctGDP * reg.fiscal.gdp_2024_bln_usd,
      avg_elasticity: avgElast,
      gdp_impact_pct: -tradeDivertedPctGDP * 0.35 * 100,
    };
  }

  function runIO(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const importShare = 0.028;
    const directCostShock = t * importShare;
    const mult = reg.io_summary.type_ii_avg_multiplier;
    const sectoralOutputChg = -directCostShock * mult * 100;
    return {
      multiplier: mult,
      sectoral_output_chg_pct: sectoralOutputChg,
      most_affected: 'Plastics & rubber',
      gdp_impact_pct: sectoralOutputChg * 0.24,
    };
  }

  function runCGE(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const sigma_q = (reg.cge_structural && reg.cge_structural.armington_sigma_q) || 0.70;
    const importShare = 0.028;
    const welfareLoss = 0.5 * t * t * sigma_q * importShare * 100;
    const gdpImpact = -welfareLoss * 2.1;
    const passThrough = reg.macro_baseline.exchange_rate_pass_through;
    const inflationBump = t * passThrough * importShare * 100;
    return {
      gdp_impact_pct: gdpImpact,
      inflation_bump_pp: inflationBump,
      welfare_loss_pct: welfareLoss,
      armington: sigma_q,
    };
  }

  function runFPP(shock, reg, peOut) {
    const t = (shock.tariff_pp || 0) / 100;
    const gdp = reg.fiscal.gdp_2024_bln_usd;
    const importsBase = 0.028 * gdp * 1e9;
    const peImportChg = (peOut && peOut.import_volume_chg_pct) || 0;
    const importsAfter = importsBase * (1 + peImportChg / 100);
    const effEff = reg.fiscal.customs_collection_efficiency;
    const newTariff = reg.fiscal.avg_tariff_rate + t;
    const tariffRevenue = importsAfter * newTariff * effEff;
    const tariffRevenueBase = importsBase * reg.fiscal.avg_tariff_rate * effEff;
    const deltaRevenue = (tariffRevenue - tariffRevenueBase) / 1e9;
    return {
      tariff_revenue_chg_bln_usd: deltaRevenue,
      revenue_chg_pct_gdp: (deltaRevenue / gdp) * 100,
      current_account_chg_pct_gdp: -(peOut && peOut.gdp_impact_pct || 0) * 0.6,
      gdp_impact_pct: (peOut && peOut.gdp_impact_pct || 0) * 0.9,
    };
  }

  window.SynthEngines = {
    runPE: runPE,
    runIO: runIO,
    runCGE: runCGE,
    runFPP: runFPP,
    runAll: function (shock) {
      if (!window.EPE || !EPE.registry) throw new Error('Registry not loaded');
      const reg = EPE.registry;
      const pe = runPE(shock, reg);
      const io = runIO(shock, reg);
      const cge = runCGE(shock, reg);
      const fpp = runFPP(shock, reg, pe);
      return { pe: pe, io: io, cge: cge, fpp: fpp };
    },
  };

})();
