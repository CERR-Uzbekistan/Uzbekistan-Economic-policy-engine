'use strict';

/**
 * scenario-engine.js
 * ------------------
 * Shared module for saving, loading, comparing, and exporting
 * macroeconomic policy simulation scenarios.
 *
 * Storage: localStorage key 'uz_policy_scenarios'
 * Limit:   50 scenarios (oldest auto-deleted when exceeded)
 */

/* ───────── Model metadata ───────── */

const MODEL_META = {
  qpm: { name: 'QPM Simulator',        icon: '\u{1F4C8}', color: '#2563eb' },
  dfm: { name: 'GDP Nowcasting',       icon: '\u{1F52E}', color: '#d97706' },
  pe:  { name: 'Partial Equilibrium',   icon: '\u2696\uFE0F', color: '#16a34a' },
  io:  { name: 'Input-Output',          icon: '\u{1F517}', color: '#0d9488' },
  cge: { name: 'CGE Model',             icon: '\u2699\uFE0F', color: '#7c3aed' },
  fpp: { name: 'Financial Programming', icon: '\u{1F4B0}', color: '#dc2626' }
};

/* ───────── Constants ───────── */

const STORAGE_KEY  = 'uz_policy_scenarios';
const MAX_SCENARIOS = 50;

/* ───────── Internal helpers ───────── */

/**
 * Read all scenarios from localStorage.
 * @returns {Array} Parsed array of scenario objects (empty array on first use).
 */
function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ScenarioEngine] Could not parse stored scenarios, resetting.', e);
    return [];
  }
}

/**
 * Persist scenarios array to localStorage.
 * @param {Array} scenarios
 */
function _persist(scenarios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (_) {
    /* localStorage unavailable (private browsing, quota exceeded) — changes live in memory only */
  }
}

/**
 * Enforce the 50-scenario cap by removing the oldest entries.
 * @param {Array} scenarios - mutated in place
 */
function _enforceLimit(scenarios) {
  if (scenarios.length > MAX_SCENARIOS) {
    // Sort ascending by timestamp so we can trim from the front
    scenarios.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    scenarios.splice(0, scenarios.length - MAX_SCENARIOS);
  }
}

/* ───────── ScenarioEngine ───────── */

window.ScenarioEngine = {

  /** Expose model metadata for consumers. */
  MODEL_META: MODEL_META,

  /* ---- save ---- */

  /**
   * Save a scenario snapshot.
   *
   * @param {Object} scenario - Must include at minimum `name`, `model`, `params`.
   *   Fields `id`, `timestamp`, `results`, `tags`, `notes` are auto-filled if missing.
   * @returns {Object} The saved scenario (with generated id / timestamp).
   */
  save: function (scenario) {
    if (!scenario || !scenario.name || !scenario.model) {
      throw new Error('[ScenarioEngine] scenario.name and scenario.model are required.');
    }

    var entry = {
      id:        scenario.id        || crypto.randomUUID(),
      name:      scenario.name,
      model:     scenario.model,
      timestamp: scenario.timestamp || new Date().toISOString(),
      params:    scenario.params    || {},
      results:   Object.assign({ kpis: [], chartData: null, tables: [] }, scenario.results || {}),
      tags:      scenario.tags      || [],
      notes:     scenario.notes     || ''
    };

    var scenarios = _load();
    scenarios.push(entry);
    _enforceLimit(scenarios);
    _persist(scenarios);

    return entry;
  },

  /* ---- list ---- */

  /**
   * List saved scenarios with optional filters.
   *
   * @param {Object} [filters]
   * @param {string} [filters.model] - Filter by model key (e.g. 'qpm').
   * @param {string} [filters.tag]   - Filter by tag (exact match inside tags array).
   * @param {string} [filters.search]- Case-insensitive substring match on name or notes.
   * @returns {Array} Matching scenarios sorted by timestamp descending.
   */
  list: function (filters) {
    var scenarios = _load();
    filters = filters || {};

    if (filters.model) {
      scenarios = scenarios.filter(function (s) { return s.model === filters.model; });
    }
    if (filters.tag) {
      scenarios = scenarios.filter(function (s) {
        return Array.isArray(s.tags) && s.tags.indexOf(filters.tag) !== -1;
      });
    }
    if (filters.search) {
      var q = filters.search.toLowerCase();
      scenarios = scenarios.filter(function (s) {
        return (s.name  || '').toLowerCase().indexOf(q) !== -1 ||
               (s.notes || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    // Most recent first
    scenarios.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    return scenarios;
  },

  /* ---- get ---- */

  /**
   * Retrieve a single scenario by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  get: function (id) {
    var scenarios = _load();
    for (var i = 0; i < scenarios.length; i++) {
      if (scenarios[i].id === id) return scenarios[i];
    }
    return null;
  },

  /* ---- remove ---- */

  /**
   * Delete a scenario by ID.
   * @param {string} id
   * @returns {boolean} True if a scenario was removed.
   */
  remove: function (id) {
    var scenarios = _load();
    var filtered  = scenarios.filter(function (s) { return s.id !== id; });
    if (filtered.length === scenarios.length) return false;
    _persist(filtered);
    return true;
  },

  /* ---- compare ---- */

  /**
   * Compare 2-4 scenarios side-by-side.
   *
   * Deltas are computed relative to the first scenario in the list.
   *
   * @param {string[]} ids - Array of 2-4 scenario IDs.
   * @returns {Object} { scenarios, deltas, kpiComparison }
   */
  compare: function (ids) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 4) {
      throw new Error('[ScenarioEngine] compare() requires 2-4 scenario IDs.');
    }

    var scenarios = ids.map(function (id) {
      var s = window.ScenarioEngine.get(id);
      if (!s) throw new Error('[ScenarioEngine] Scenario not found: ' + id);
      return s;
    });

    var base = scenarios[0];

    // --- Parameter deltas ---
    // Collect the union of all parameter keys across selected scenarios.
    var paramKeys = {};
    scenarios.forEach(function (s) {
      Object.keys(s.params || {}).forEach(function (k) { paramKeys[k] = true; });
    });

    var deltas = Object.keys(paramKeys).map(function (key) {
      var values = scenarios.map(function (s) { return s.params[key] != null ? s.params[key] : null; });
      var baseVal = values[0];
      var diffs  = values.map(function (v, i) {
        if (i === 0) return null;                       // base has no diff
        if (v == null || baseVal == null) return null;   // can't compute
        if (typeof v === 'number' && typeof baseVal === 'number') return v - baseVal;
        return null;                                     // non-numeric
      });
      return { param: key, values: values, diffs: diffs };
    });

    // --- KPI comparison ---
    // Align KPIs by label across scenarios.
    var kpiLabels = {};
    scenarios.forEach(function (s) {
      ((s.results && s.results.kpis) || []).forEach(function (kpi) {
        kpiLabels[kpi.label] = true;
      });
    });

    var kpiComparison = Object.keys(kpiLabels).map(function (label) {
      var values = scenarios.map(function (s) {
        var match = ((s.results && s.results.kpis) || []).find(function (k) { return k.label === label; });
        return match ? match.value : null;
      });
      var baseVal = values[0];
      var diffs = values.map(function (v, i) {
        if (i === 0) return null;
        if (v == null || baseVal == null) return null;
        if (typeof v === 'number' && typeof baseVal === 'number') return v - baseVal;
        return null;
      });
      return { label: label, values: values, diffs: diffs };
    });

    return {
      scenarios:     scenarios,
      deltas:        deltas,
      kpiComparison: kpiComparison
    };
  },

  /* ---- exportComparison ---- */

  /**
   * Export a CSV string comparing 2-4 scenarios.
   *
   * @param {string[]} ids
   * @returns {string} CSV content ready for download.
   */
  exportComparison: function (ids) {
    var result = window.ScenarioEngine.compare(ids);
    var names  = result.scenarios.map(function (s) { return s.name; });
    var lines  = [];

    // Helper: escape a CSV cell value.
    function esc(val) {
      if (val == null) return '';
      var str = String(val);
      if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    // Header row
    var header = ['Type', 'Parameter / KPI'].concat(names);
    // Add delta columns for scenarios 2+
    for (var d = 1; d < names.length; d++) {
      header.push('Delta vs ' + names[0] + ' (' + names[d] + ')');
    }
    lines.push(header.map(esc).join(','));

    // Parameter rows
    result.deltas.forEach(function (row) {
      var cells = ['Param', row.param].concat(row.values.map(esc));
      for (var i = 1; i < row.diffs.length; i++) {
        cells.push(esc(row.diffs[i]));
      }
      lines.push(cells.join(','));
    });

    // KPI rows
    result.kpiComparison.forEach(function (row) {
      var cells = ['KPI', row.label].concat(row.values.map(esc));
      for (var i = 1; i < row.diffs.length; i++) {
        cells.push(esc(row.diffs[i]));
      }
      lines.push(cells.join(','));
    });

    return lines.join('\n');
  },

  /* ---- getPresets ---- */

  /**
   * Return pre-built scenario presets.
   * These are templates — call ScenarioEngine.save() on one to persist it.
   *
   * @returns {Object[]} Array of preset scenario objects (without id/timestamp).
   */
  getPresets: function () {
    return [
      {
        name:  'WTO Baseline',
        model: 'pe',
        params: { mfn_cut_pct: 20, scenario_type: 'uniform' },
        tags:  ['baseline', 'wto'],
        notes: 'Uniform 20% MFN tariff cut across all HS lines.'
      },
      {
        name:  'WTO Aggressive',
        model: 'pe',
        params: { mfn_cut_pct: 50, scenario_type: 'uniform' },
        tags:  ['wto'],
        notes: 'Aggressive 50% MFN tariff cut across all HS lines.'
      },
      {
        name:  'Monetary Tightening',
        model: 'qpm',
        params: { rate_shock_pp: 2 },
        tags:  ['monetary'],
        notes: '+2 percentage-point policy rate shock.'
      },
      {
        name:  'External Shock',
        model: 'qpm',
        params: { exchange_rate_depreciation_pp: 5 },
        tags:  ['external'],
        notes: '+5 percentage-point exchange rate depreciation shock.'
      },
      {
        name:  'Fiscal Expansion',
        model: 'fpp',
        params: { spending_increase_gdp_pct: 2 },
        tags:  ['fiscal'],
        notes: '+2% of GDP increase in government spending.'
      }
    ];
  }
};
