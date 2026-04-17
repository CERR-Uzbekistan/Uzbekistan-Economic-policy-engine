/* ═══════════════════════════════════════════════════════════════
   Shared Synthesis Engines
   Reusable cross-model shock computations. All engines read from
   window.EPE.registry. Each engine takes (shockSpec, registry) and
   returns a flat object of KPIs including keys the reconciliation
   table can compare: gdp_impact_pct, inflation_pp, revenue_pct_gdp.
   ═══════════════════════════════════════════════════════════════ */
(function () {

  function horizonScale(reg, horizonQ) {
    const ramp = (reg.synth_coefficients && reg.synth_coefficients.horizon_ramp) || { 4: 0.55, 8: 0.85, 12: 1.0 };
    const key = String(horizonQ || 8);
    if (ramp[key] != null) return ramp[key];
    const keys = Object.keys(ramp).map(Number).sort((a, b) => a - b);
    const h = Number(horizonQ) || 8;
    if (h <= keys[0]) return ramp[keys[0]];
    if (h >= keys[keys.length - 1]) return ramp[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (h >= a && h <= b) {
        const w = (h - a) / (b - a);
        return ramp[a] * (1 - w) + ramp[b] * w;
      }
    }
    return 1.0;
  }

  function runPE(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const scale = horizonScale(reg, shock.horizon_q);
    const chapters = Object.keys(reg.trade_elasticities.by_hs_chapter);
    const elast = chapters.map(c => reg.trade_elasticities.by_hs_chapter[c].import_demand);
    const avgElast = elast.reduce((a, b) => a + b, 0) / elast.length;
    const importShare = reg.synth_coefficients.hs28_40_import_share_gdp;
    const welfareRatio = reg.synth_coefficients.pe_welfare_to_gdp_ratio;
    const importChg = avgElast * t * scale;
    const tradeDivertedPctGDP = Math.abs(importChg) * importShare;
    return {
      import_volume_chg_pct: importChg * 100,
      trade_diverted_bln_usd: tradeDivertedPctGDP * reg.fiscal.gdp_2024_bln_usd,
      avg_elasticity: avgElast,
      gdp_impact_pct: -tradeDivertedPctGDP * welfareRatio * 100,
      inflation_pp: 0,
    };
  }

  function runIO(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const scale = horizonScale(reg, shock.horizon_q);
    const importShare = reg.synth_coefficients.hs28_40_import_share_gdp;
    const mult = reg.io_summary.type_ii_avg_multiplier;
    const sectoralRatio = reg.synth_coefficients.io_sectoral_to_gdp_ratio;
    const directCostShock = t * importShare * scale;
    const sectoralOutputChg = -directCostShock * mult * 100;
    return {
      multiplier: mult,
      sectoral_output_chg_pct: sectoralOutputChg,
      most_affected: 'Plastics & rubber',
      gdp_impact_pct: sectoralOutputChg * sectoralRatio,
      inflation_pp: 0,
    };
  }

  function runCGE(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const scale = horizonScale(reg, shock.horizon_q);
    const sigma_q = (reg.cge_structural && reg.cge_structural.armington_sigma_q) || 0.70;
    const importShare = reg.synth_coefficients.hs28_40_import_share_gdp;
    const welfareLoss = 0.5 * t * t * sigma_q * importShare * 100 * scale;
    const gdpImpact = -welfareLoss * 2.1;
    const passThrough = reg.macro_baseline.exchange_rate_pass_through;
    const inflationBump = t * passThrough * importShare * 100 * scale;
    return {
      gdp_impact_pct: gdpImpact,
      inflation_pp: inflationBump,
      inflation_bump_pp: inflationBump,
      welfare_loss_pct: welfareLoss,
      armington: sigma_q,
    };
  }

  // FPP computed independently from tariff + import base, not from PE output.
  // Uses trade elasticity from registry (shared with PE) but its own
  // current-account and revenue channels.
  function runFPP(shock, reg) {
    const t = (shock.tariff_pp || 0) / 100;
    const scale = horizonScale(reg, shock.horizon_q);
    const gdp = reg.fiscal.gdp_2024_bln_usd;
    const importShare = reg.synth_coefficients.hs28_40_import_share_gdp;
    const caRatio = reg.synth_coefficients.fpp_import_compression_to_ca_ratio;
    const revenuePassthrough = reg.synth_coefficients.fpp_revenue_to_gdp_passthrough;
    // Independent elasticity read (same source as PE so cross-model comparable)
    const chapters = Object.keys(reg.trade_elasticities.by_hs_chapter);
    const elast = chapters.map(c => reg.trade_elasticities.by_hs_chapter[c].import_demand);
    const avgElast = elast.reduce((a, b) => a + b, 0) / elast.length;
    const importChg = avgElast * t * scale; // negative

    const importsBase = importShare * gdp * 1e9;
    const importsAfter = importsBase * (1 + importChg);
    const effEff = reg.fiscal.customs_collection_efficiency;
    const vatRate = reg.fiscal.import_vat_rate;
    const newTariff = reg.fiscal.avg_tariff_rate + t;
    // Revenue = tariff revenue + VAT on tariff-inclusive base. Collection efficiency on both.
    const tariffRev = importsAfter * newTariff * effEff;
    const vatRev = importsAfter * (1 + newTariff) * vatRate * effEff;
    const baseTariffRev = importsBase * reg.fiscal.avg_tariff_rate * effEff;
    const baseVatRev = importsBase * (1 + reg.fiscal.avg_tariff_rate) * vatRate * effEff;
    const deltaRevenue = ((tariffRev + vatRev) - (baseTariffRev + baseVatRev)) / 1e9;

    // Current account: import compression improves CA; scaled by structural ratio.
    const importCompressionPctGDP = Math.abs(importChg) * importShare * 100;
    const caChgPctGDP = importCompressionPctGDP * caRatio;

    // GDP impact proxy: tariff revenue recycled via fiscal spending (+) minus import cost drag (−)
    const fiscalBoost = (deltaRevenue / gdp) * revenuePassthrough * 100;
    const importDrag = -importCompressionPctGDP * 0.20; // demand leakage
    const gdpImpact = fiscalBoost + importDrag;

    return {
      tariff_revenue_chg_bln_usd: deltaRevenue,
      revenue_chg_pct_gdp: (deltaRevenue / gdp) * 100,
      current_account_chg_pct_gdp: caChgPctGDP,
      gdp_impact_pct: gdpImpact,
      inflation_pp: 0,
    };
  }

  window.SynthEngines = {
    runPE: runPE,
    runIO: runIO,
    runCGE: runCGE,
    runFPP: runFPP,
    horizonScale: horizonScale,
    runAll: function (shock) {
      if (!window.EPE || !EPE.registry) throw new Error('Registry not loaded');
      const reg = EPE.registry;
      const pe = runPE(shock, reg);
      const io = runIO(shock, reg);
      const cge = runCGE(shock, reg);
      const fpp = runFPP(shock, reg);
      return { pe: pe, io: io, cge: cge, fpp: fpp };
    },
  };

})();
