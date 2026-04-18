/**
 * PolicyAdvisor — AI-powered policy analysis for the Uzbekistan Economic Policy Engine
 * Generates narrative policy briefs from macroeconomic simulation results using
 * Claude API (Anthropic) or any OpenAI-compatible API.
 *
 * Falls back to template-based analysis when no API key is configured.
 *
 * Usage:
 *   PolicyAdvisor.configure({ provider: 'anthropic', apiKey: 'sk-...', language: 'en' })
 *   const analysis = await PolicyAdvisor.analyzeSim('CGE', params, results)
 *   PolicyAdvisor.renderAdvisorPanel('container-id', analysis)
 *
 * No external dependencies — uses only the Fetch API.
 */

(function (global) {
  'use strict';

  /* ── Constants ── */

  var STORAGE_KEY = 'uz_policy_ai_config';

  var DEFAULT_CONFIG = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    language: 'en'
  };

  var SYSTEM_PROMPT =
    'You are an economic policy advisor for the Republic of Uzbekistan. ' +
    'Analyze macroeconomic simulation results and provide clear, actionable policy recommendations. ' +
    'Be specific with numbers. Reference Uzbekistan\'s current economic context: ' +
    'WTO accession process, inflation targeting transition, remittance dependency, commodity exports.';

  /* Language-specific instructions appended to system prompt */
  var LANGUAGE_INSTRUCTIONS = {
    en: 'Respond in English.',
    ru: 'Respond in Russian (Русский).',
    uz: 'Respond in Uzbek (O\'zbek tili).'
  };

  /* Section header labels for template fallback (used when no API key configured) */
  var SECTION_LABELS = {
    en: { exec: 'Executive Summary', findings: 'Key Findings', risks: 'Risk Flags', recs: 'Policy Recommendations', summary: 'Summary', recommendations: 'Recommendations' },
    ru: { exec: 'Краткое изложение', findings: 'Основные выводы', risks: 'Риски', recs: 'Рекомендации политики', summary: 'Резюме', recommendations: 'Рекомендации' },
    uz: { exec: 'Qisqacha xulosa', findings: 'Asosiy topilmalar', risks: 'Xavf omillari', recs: 'Siyosat tavsiyalari', summary: 'Xulosa', recommendations: 'Tavsiyalar' }
  };

  /** Get section labels for the current language */
  function _labels() {
    return SECTION_LABELS[_config.language] || SECTION_LABELS.en;
  }

  /* Design tokens (shared with the rest of the platform) */
  var COLORS = {
    navy:  '#0d1f3c',
    blue:  '#2563eb',
    teal:  '#0d9488',
    green: '#16a34a',
    amber: '#d97706',
    red:   '#dc2626',
    light: '#f8fafc',
    border: '#e2e8f0'
  };

  /* ── State ── */

  /** In-memory API key — never persisted to localStorage */
  var _apiKey = null;

  /** Merged config (defaults + saved) */
  var _config = Object.assign({}, DEFAULT_CONFIG);

  /* ── Initialization: load persisted config ── */
  (function loadSavedConfig() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.assign(_config, parsed);
      }
    } catch (_) {
      /* localStorage unavailable or corrupt — ignore */
    }
  })();

  /* ══════════════════════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════════════════════ */

  /** Persist config (minus apiKey) to localStorage */
  function _saveConfig() {
    try {
      var toSave = {
        provider: _config.provider,
        model: _config.model,
        language: _config.language
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (_) {
      /* silent fail */
    }
  }

  /** Format a number for display in prompts */
  function _fmt(v, decimals) {
    if (v == null) return 'N/A';
    decimals = decimals != null ? decimals : 2;
    return Number(v).toFixed(decimals);
  }

  /** Current ISO timestamp */
  function _now() {
    return new Date().toISOString();
  }

  /** Sanitize text to prevent XSS when inserting into innerHTML */
  function _esc(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  /* ══════════════════════════════════════════════════════════
     API Calling
  ══════════════════════════════════════════════════════════ */

  /**
   * Call the Anthropic Messages API.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string>} assistant reply text
   */
  function _callAnthropic(systemPrompt, userPrompt) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': _apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: _config.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error('Anthropic API error (' + res.status + '): ' +
            (err.error && err.error.message ? err.error.message : JSON.stringify(err)));
        });
      }
      return res.json();
    })
    .then(function (data) {
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }
      throw new Error('Unexpected Anthropic response format.');
    });
  }

  /**
   * Call the OpenAI Chat Completions API.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string>} assistant reply text
   */
  function _callOpenAI(systemPrompt, userPrompt) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + _apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: _config.model,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error('OpenAI API error (' + res.status + '): ' +
            (err.error && err.error.message ? err.error.message : JSON.stringify(err)));
        });
      }
      return res.json();
    })
    .then(function (data) {
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }
      throw new Error('Unexpected OpenAI response format.');
    });
  }

  /**
   * Dispatch to the configured provider.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string>}
   */
  function _callLLM(systemPrompt, userPrompt) {
    if (_config.provider === 'openai') {
      return _callOpenAI(systemPrompt, userPrompt);
    }
    return _callAnthropic(systemPrompt, userPrompt);
  }

  /* ══════════════════════════════════════════════════════════
     Response Parsing
  ══════════════════════════════════════════════════════════ */

  /**
   * Parse a structured analysis from free-form LLM text.
   * Looks for markdown-style sections; falls back gracefully.
   */
  function _parseAnalysis(text) {
    var summary = '';
    var findings = [];
    var risks = [];
    var recommendations = [];

    /* Try to extract sections by heading keywords */
    var sections = text.split(/\n#{1,3}\s+/);

    sections.forEach(function (section) {
      var lower = section.toLowerCase();
      var bullets = section.match(/[-*]\s+.+/g) || [];
      var cleaned = bullets.map(function (b) { return b.replace(/^[-*]\s+/, '').trim(); });

      if (lower.indexOf('summary') === 0 || lower.indexOf('executive') === 0) {
        summary = section.replace(/^[^\n]*\n/, '').trim();
      } else if (lower.indexOf('finding') === 0 || lower.indexOf('key finding') === 0 || lower.indexOf('analysis') === 0) {
        findings = cleaned.length ? cleaned : _extractSentences(section, 5);
      } else if (lower.indexOf('risk') === 0 || lower.indexOf('warning') === 0 || lower.indexOf('concern') === 0) {
        risks = cleaned.length ? cleaned : _extractSentences(section, 3);
      } else if (lower.indexOf('recommend') === 0 || lower.indexOf('policy') === 0 || lower.indexOf('action') === 0) {
        recommendations = cleaned.length ? cleaned : _extractSentences(section, 5);
      }
    });

    /* Fallback: if parsing missed sections, derive from full text */
    if (!summary) {
      var sentences = text.split(/\.\s+/);
      summary = sentences.slice(0, 3).join('. ').trim();
      if (summary && !summary.endsWith('.')) summary += '.';
    }
    if (findings.length === 0) findings = _extractSentences(text, 5);
    if (risks.length === 0) risks = ['See full analysis for detailed risk assessment.'];
    if (recommendations.length === 0) recommendations = ['See full analysis for detailed recommendations.'];

    return {
      summary: summary,
      findings: findings,
      risks: risks,
      recommendations: recommendations,
      fullText: text
    };
  }

  /** Pull N distinct sentences from text as a fallback */
  function _extractSentences(text, n) {
    var sentences = text
      .replace(/\n/g, ' ')
      .split(/\.\s+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 20; });
    return sentences.slice(0, n).map(function (s) {
      return s.endsWith('.') ? s : s + '.';
    });
  }

  /* ══════════════════════════════════════════════════════════
     Fallback Template Engine (no API key required)
  ══════════════════════════════════════════════════════════ */

  /**
   * Generate a template-based analysis using simple heuristic rules.
   * Works entirely offline — no API call needed.
   */
  function _fallbackAnalysis(modelId, params, results) {
    var findings = [];
    var risks = [];
    var recommendations = [];

    /* Extract common KPIs from results, tolerating different key names */
    var gdp = results.gdpGrowth || results.gdp_growth || results.GDP_growth;
    var inflation = results.inflation || results.cpi || results.CPI;
    var currentAccount = results.currentAccount || results.current_account || results.CA;
    var unemployment = results.unemployment || results.unemp;
    var fiscalBalance = results.fiscalBalance || results.fiscal_balance || results.budget;
    var tradeBalance = results.tradeBalance || results.trade_balance;
    var exchangeRate = results.exchangeRate || results.exchange_rate || results.FX;
    var remittances = results.remittances || results.remittance_gdp;

    /* GDP growth assessment */
    if (gdp != null) {
      if (gdp < 3) {
        findings.push('GDP growth of ' + _fmt(gdp, 1) + '% is significantly below Uzbekistan\'s potential of ~5-6%.');
        risks.push('Below-potential growth may increase poverty and undermine reform momentum.');
        recommendations.push('Consider counter-cyclical fiscal stimulus focused on infrastructure investment and SME support.');
      } else if (gdp < 4) {
        findings.push('GDP growth of ' + _fmt(gdp, 1) + '% is below Uzbekistan\'s potential output trajectory.');
        recommendations.push('Accelerate structural reforms to boost productivity, particularly in agriculture and services.');
      } else if (gdp >= 6) {
        findings.push('GDP growth of ' + _fmt(gdp, 1) + '% is strong, consistent with rapid convergence.');
        recommendations.push('Ensure growth quality by monitoring credit expansion and investment efficiency.');
      } else {
        findings.push('GDP growth of ' + _fmt(gdp, 1) + '% is within a healthy range for Uzbekistan\'s development stage.');
      }
    }

    /* Inflation assessment */
    if (inflation != null) {
      if (inflation > 12) {
        findings.push('Inflation at ' + _fmt(inflation, 1) + '% is well above the Central Bank target range.');
        risks.push('High inflation erodes purchasing power and complicates the inflation-targeting transition.');
        recommendations.push('The Central Bank should tighten monetary policy; consider delaying administered price adjustments.');
      } else if (inflation > 10) {
        findings.push('Inflation at ' + _fmt(inflation, 1) + '% signals price stability concerns.');
        risks.push('Persistent above-target inflation risks de-anchoring expectations.');
        recommendations.push('Maintain tight monetary stance and improve CBU forward guidance communication.');
      } else if (inflation < 5) {
        findings.push('Inflation at ' + _fmt(inflation, 1) + '% is relatively well contained.');
      } else {
        findings.push('Inflation at ' + _fmt(inflation, 1) + '% is moderately elevated but manageable.');
      }
    }

    /* Current account */
    if (currentAccount != null) {
      var caAbs = Math.abs(currentAccount);
      if (currentAccount < -5) {
        findings.push('Current account deficit of ' + _fmt(caAbs, 1) + '% of GDP signals external vulnerability.');
        risks.push('A wide external deficit increases dependence on capital inflows and reserve drawdowns.');
        recommendations.push('Promote export diversification beyond gold and gas; support textile and horticultural value chains.');
      } else if (currentAccount < -3) {
        findings.push('Current account deficit of ' + _fmt(caAbs, 1) + '% of GDP is within a manageable range.');
      } else if (currentAccount > 0) {
        findings.push('Current account surplus of ' + _fmt(currentAccount, 1) + '% of GDP strengthens the external position.');
      }
    }

    /* Unemployment */
    if (unemployment != null) {
      if (unemployment > 10) {
        findings.push('Unemployment at ' + _fmt(unemployment, 1) + '% requires urgent labor market interventions.');
        recommendations.push('Scale up vocational training programs and youth employment initiatives.');
      } else if (unemployment > 7) {
        findings.push('Unemployment at ' + _fmt(unemployment, 1) + '% remains above regional benchmarks.');
      }
    }

    /* Fiscal balance */
    if (fiscalBalance != null) {
      if (fiscalBalance < -5) {
        risks.push('Fiscal deficit of ' + _fmt(Math.abs(fiscalBalance), 1) + '% of GDP may strain debt sustainability.');
        recommendations.push('Improve tax administration and phase out poorly targeted energy subsidies.');
      } else if (fiscalBalance < -3) {
        findings.push('Fiscal deficit of ' + _fmt(Math.abs(fiscalBalance), 1) + '% of GDP is within prudent limits for a developing economy.');
      }
    }

    /* Remittances */
    if (remittances != null && remittances > 10) {
      risks.push('Remittance dependency (' + _fmt(remittances, 0) + '% of GDP) exposes the economy to external labor market shocks.');
      recommendations.push('Diversify income sources and channel remittance flows toward productive investment via financial inclusion.');
    }

    /* Exchange rate */
    if (exchangeRate != null) {
      findings.push('Exchange rate stands at ' + _fmt(exchangeRate, 0) + ' UZS/USD under the simulation scenario.');
    }

    /* Trade balance */
    if (tradeBalance != null && tradeBalance < -3) {
      findings.push('Trade deficit of ' + _fmt(Math.abs(tradeBalance), 1) + '% of GDP reflects import dependence in the transition period.');
    }

    /* Ensure minimums */
    if (findings.length === 0) findings.push('Simulation completed for model "' + modelId + '" with the given parameters.');
    if (risks.length === 0) risks.push('No critical risk flags identified under this scenario.');
    if (recommendations.length === 0) recommendations.push('Continue monitoring key indicators and adjust policy as new data emerges.');

    /* Build summary */
    var summary = 'The ' + modelId + ' simulation suggests ';
    if (gdp != null) summary += 'GDP growth of ' + _fmt(gdp, 1) + '%';
    if (gdp != null && inflation != null) summary += ' with inflation at ' + _fmt(inflation, 1) + '%';
    if (gdp == null && inflation != null) summary += 'inflation at ' + _fmt(inflation, 1) + '%';
    if (gdp == null && inflation == null) summary += 'the given scenario parameters';
    summary += '. ';
    summary += findings.length > 1 ? findings[1] : findings[0];

    /* Build full text narrative */
    var _lbl = _labels();
    var fullText = '# Policy Brief: ' + modelId + ' Simulation Results\n\n';
    fullText += '## ' + _lbl.exec + '\n' + summary + '\n\n';
    fullText += '## ' + _lbl.findings + '\n' + findings.map(function (f) { return '- ' + f; }).join('\n') + '\n\n';
    fullText += '## ' + _lbl.risks + '\n' + risks.map(function (r) { return '- ' + r; }).join('\n') + '\n\n';
    fullText += '## ' + _lbl.recs + '\n' + recommendations.map(function (r) { return '- ' + r; }).join('\n') + '\n\n';
    fullText += '_Generated by template engine (no API key configured). For richer analysis, configure an AI provider via PolicyAdvisor.configure()._';

    return {
      summary: summary,
      findings: findings,
      risks: risks,
      recommendations: recommendations,
      fullText: fullText,
      language: _config.language,
      model: 'template-fallback',
      timestamp: _now()
    };
  }

  /* ══════════════════════════════════════════════════════════
     Public API
  ══════════════════════════════════════════════════════════ */

  /**
   * configure(options) — Set API configuration.
   * @param {Object} options
   * @param {string} [options.provider]  'anthropic' | 'openai'
   * @param {string} [options.apiKey]    User's API key (kept in memory only)
   * @param {string} [options.model]     Model identifier
   * @param {string} [options.language]  'en' | 'ru' | 'uz'
   */
  function configure(options) {
    if (!options || typeof options !== 'object') return;

    if (options.provider) _config.provider = options.provider;
    if (options.model)    _config.model = options.model;
    if (options.language)  _config.language = options.language;

    /* API key: store in memory only, never in localStorage */
    if (options.apiKey) _apiKey = options.apiKey;

    _saveConfig();
  }

  /**
   * analyzeSim(modelId, params, results) — Generate a policy brief.
   * Uses the configured LLM if an API key is present; otherwise falls back
   * to the template engine.
   *
   * @param {string} modelId   e.g. 'CGE', 'DSGE', 'PE'
   * @param {Object} params    Simulation input parameters
   * @param {Object} results   Simulation output (KPIs, forecasts)
   * @returns {Promise<Object>} Structured analysis object
   */
  function analyzeSim(modelId, params, results) {
    /* If no API key, use template fallback */
    if (!_apiKey) {
      return Promise.resolve(_fallbackAnalysis(modelId, params, results));
    }

    var langInstruction = LANGUAGE_INSTRUCTIONS[_config.language] || LANGUAGE_INSTRUCTIONS.en;
    var systemMsg = SYSTEM_PROMPT + ' ' + langInstruction;

    /* Format results into readable text for the prompt */
    var kpiLines = Object.keys(results).map(function (key) {
      var val = results[key];
      if (typeof val === 'number') return '  ' + key + ': ' + _fmt(val);
      if (Array.isArray(val)) return '  ' + key + ': [' + val.map(function (v) { return _fmt(v); }).join(', ') + ']';
      return '  ' + key + ': ' + String(val);
    }).join('\n');

    var paramLines = Object.keys(params).map(function (key) {
      return '  ' + key + ': ' + String(params[key]);
    }).join('\n');

    var userMsg =
      'Model: ' + modelId + '\n\n' +
      'Simulation Parameters:\n' + paramLines + '\n\n' +
      'Simulation Results (KPIs):\n' + kpiLines + '\n\n' +
      'Please provide your analysis in the following structure:\n' +
      '## Executive Summary\n(2-3 sentences)\n\n' +
      '## Key Findings\n(3-5 bullet points)\n\n' +
      '## Risk Flags\n(2-3 bullet points)\n\n' +
      '## Policy Recommendations\n(3-5 bullet points)\n';

    return _callLLM(systemMsg, userMsg)
      .then(function (text) {
        var parsed = _parseAnalysis(text);
        parsed.language = _config.language;
        parsed.model = _config.model;
        parsed.timestamp = _now();
        return parsed;
      })
      .catch(function (err) {
        /* On API failure, fall back to template with error note */
        var fallback = _fallbackAnalysis(modelId, params, results);
        fallback.fullText = '> AI analysis failed: ' + err.message + '\n> Showing template-based analysis.\n\n' + fallback.fullText;
        fallback.model = 'template-fallback (API error)';
        return fallback;
      });
  }

  /**
   * generateNowcastBrief(dfmData) — Generate a monthly economic briefing
   * from Dynamic Factor Model (DFM) nowcasting results.
   *
   * @param {Object} dfmData  Nowcast output containing indicators, factors, estimates
   * @returns {Promise<Object>} Structured analysis
   */
  function generateNowcastBrief(dfmData) {
    if (!_apiKey) {
      /* Template fallback for nowcast */
      var gdpNow = dfmData.gdpNowcast || dfmData.gdp_nowcast || dfmData.estimate;
      var prevGdp = dfmData.previousEstimate || dfmData.prev_estimate;
      var findings = [];
      var risks = [];
      var recs = [];

      if (gdpNow != null) {
        findings.push('Current GDP nowcast estimate: ' + _fmt(gdpNow, 1) + '% annualized growth.');
      }
      if (prevGdp != null && gdpNow != null) {
        var delta = gdpNow - prevGdp;
        var direction = delta >= 0 ? 'upward' : 'downward';
        findings.push('Revision from previous estimate: ' + _fmt(delta, 2) + ' pp (' + direction + ').');
      }
      if (dfmData.factors) {
        findings.push('Factor analysis based on ' + Object.keys(dfmData.factors).length + ' high-frequency indicators.');
      }
      findings.push('Nowcast reflects data available through ' + (dfmData.vintageDate || 'latest vintage') + '.');

      risks.push('Nowcast accuracy depends on timely release of high-frequency data.');
      if (gdpNow != null && gdpNow < 4) {
        risks.push('Below-trend nowcast may signal emerging economic headwinds.');
      }

      recs.push('Cross-reference with sentiment surveys and leading indicators for confirmation.');
      recs.push('Update the nowcast as new monthly releases become available.');

      var summary = 'The DFM nowcast estimates GDP growth at ' +
        _fmt(gdpNow, 1) + '% for the current quarter' +
        (prevGdp != null ? ', revised from ' + _fmt(prevGdp, 1) + '%' : '') + '.';

      var _lbl2 = _labels();
      var fullText = '# Monthly Economic Nowcast Briefing\n\n' +
        '## ' + _lbl2.summary + '\n' + summary + '\n\n' +
        '## ' + _lbl2.findings + '\n' + findings.map(function (f) { return '- ' + f; }).join('\n') + '\n\n' +
        '## ' + _lbl2.risks + '\n' + risks.map(function (r) { return '- ' + r; }).join('\n') + '\n\n' +
        '## ' + _lbl2.recommendations + '\n' + recs.map(function (r) { return '- ' + r; }).join('\n') + '\n\n' +
        '_Template-based nowcast brief. Configure an API key for AI-generated analysis._';

      return Promise.resolve({
        summary: summary,
        findings: findings,
        risks: risks,
        recommendations: recs,
        fullText: fullText,
        language: _config.language,
        model: 'template-fallback',
        timestamp: _now()
      });
    }

    /* AI-powered nowcast brief */
    var langInstruction = LANGUAGE_INSTRUCTIONS[_config.language] || LANGUAGE_INSTRUCTIONS.en;
    var systemMsg = SYSTEM_PROMPT + ' ' + langInstruction +
      ' Focus on nowcasting methodology and short-term economic monitoring.';

    var dataLines = Object.keys(dfmData).map(function (key) {
      var val = dfmData[key];
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return '  ' + key + ': ' + JSON.stringify(val);
      }
      return '  ' + key + ': ' + String(val);
    }).join('\n');

    var userMsg =
      'DFM Nowcasting Results:\n' + dataLines + '\n\n' +
      'Generate a monthly economic nowcast briefing for Uzbekistan policymakers.\n' +
      'Structure:\n' +
      '## Executive Summary\n(2-3 sentences on current GDP estimate and trend)\n\n' +
      '## Key Findings\n(3-5 data-driven observations)\n\n' +
      '## Risk Flags\n(2-3 risks to the outlook)\n\n' +
      '## Policy Recommendations\n(3-5 actionable items)\n';

    return _callLLM(systemMsg, userMsg)
      .then(function (text) {
        var parsed = _parseAnalysis(text);
        parsed.language = _config.language;
        parsed.model = _config.model;
        parsed.timestamp = _now();
        return parsed;
      })
      .catch(function (err) {
        return generateNowcastBrief.call(null, Object.assign({}, dfmData, { _fallback: true }));
      });
  }

  /**
   * compareScenarios(scenarios) — Generate comparative analysis for 2+ scenarios.
   *
   * @param {Array<Object>} scenarios  Array of { name, params, results }
   * @returns {Promise<Object>} Structured comparative analysis
   */
  function compareScenarios(scenarios) {
    if (!Array.isArray(scenarios) || scenarios.length < 2) {
      return Promise.reject(new Error('compareScenarios requires at least 2 scenarios.'));
    }

    if (!_apiKey) {
      /* Template-based comparison */
      var findings = [];
      var risks = [];
      var recommendations = [];
      var names = scenarios.map(function (s) { return s.name || 'Unnamed'; });

      /* Compare GDP across scenarios */
      var gdpValues = scenarios.map(function (s) {
        return {
          name: s.name || 'Unnamed',
          gdp: s.results.gdpGrowth || s.results.gdp_growth || s.results.GDP_growth,
          inflation: s.results.inflation || s.results.cpi,
          ca: s.results.currentAccount || s.results.current_account
        };
      });

      /* Find best GDP scenario */
      var bestGdp = gdpValues.reduce(function (best, cur) {
        if (cur.gdp != null && (best.gdp == null || cur.gdp > best.gdp)) return cur;
        return best;
      }, { gdp: null });

      if (bestGdp.gdp != null) {
        findings.push('Highest GDP growth: "' + bestGdp.name + '" at ' + _fmt(bestGdp.gdp, 1) + '%.');
      }

      /* Find lowest inflation scenario */
      var bestInflation = gdpValues.reduce(function (best, cur) {
        if (cur.inflation != null && (best.inflation == null || cur.inflation < best.inflation)) return cur;
        return best;
      }, { inflation: null });

      if (bestInflation.inflation != null) {
        findings.push('Lowest inflation: "' + bestInflation.name + '" at ' + _fmt(bestInflation.inflation, 1) + '%.');
      }

      /* Per-scenario summary */
      gdpValues.forEach(function (s) {
        var parts = [];
        if (s.gdp != null) parts.push('GDP ' + _fmt(s.gdp, 1) + '%');
        if (s.inflation != null) parts.push('inflation ' + _fmt(s.inflation, 1) + '%');
        if (s.ca != null) parts.push('CA ' + _fmt(s.ca, 1) + '% GDP');
        if (parts.length) {
          findings.push('"' + s.name + '": ' + parts.join(', ') + '.');
        }
      });

      /* Trade-offs */
      if (bestGdp.name !== bestInflation.name && bestGdp.gdp != null && bestInflation.inflation != null) {
        risks.push('Growth-inflation trade-off detected: the highest-growth scenario is not the lowest-inflation one.');
      }
      risks.push('Scenario outcomes depend on assumptions; real-world shocks may alter rankings.');

      recommendations.push('Weigh growth vs. stability trade-offs based on current policy priorities.');
      recommendations.push('Conduct sensitivity analysis on key parameters before selecting a policy path.');
      recommendations.push('Consider hybrid approaches that combine elements from the best-performing scenarios.');

      var summary = 'Comparing ' + names.length + ' scenarios (' + names.join(', ') + '). ' +
        (bestGdp.gdp != null ? '"' + bestGdp.name + '" yields the highest growth at ' + _fmt(bestGdp.gdp, 1) + '%.' : '');

      var _lbl3 = _labels();
      var fullText = '# Scenario Comparison\n\n' +
        '## ' + _lbl3.summary + '\n' + summary + '\n\n' +
        '## ' + _lbl3.findings + '\n' + findings.map(function (f) { return '- ' + f; }).join('\n') + '\n\n' +
        '## ' + _lbl3.risks + '\n' + risks.map(function (r) { return '- ' + r; }).join('\n') + '\n\n' +
        '## ' + _lbl3.recommendations + '\n' + recommendations.map(function (r) { return '- ' + r; }).join('\n') + '\n\n' +
        '_Template-based comparison. Configure an API key for AI-generated analysis._';

      return Promise.resolve({
        summary: summary,
        findings: findings,
        risks: risks,
        recommendations: recommendations,
        fullText: fullText,
        language: _config.language,
        model: 'template-fallback',
        timestamp: _now()
      });
    }

    /* AI-powered comparison */
    var langInstruction = LANGUAGE_INSTRUCTIONS[_config.language] || LANGUAGE_INSTRUCTIONS.en;
    var systemMsg = SYSTEM_PROMPT + ' ' + langInstruction +
      ' Compare the following scenarios and recommend the best policy path.';

    var scenarioBlocks = scenarios.map(function (s, i) {
      var paramStr = s.params ? Object.keys(s.params).map(function (k) {
        return '    ' + k + ': ' + String(s.params[k]);
      }).join('\n') : '    (none)';
      var resultStr = Object.keys(s.results).map(function (k) {
        var val = s.results[k];
        return '    ' + k + ': ' + (typeof val === 'number' ? _fmt(val) : String(val));
      }).join('\n');

      return 'Scenario ' + (i + 1) + ': ' + (s.name || 'Unnamed') + '\n' +
        '  Parameters:\n' + paramStr + '\n' +
        '  Results:\n' + resultStr;
    }).join('\n\n');

    var userMsg =
      scenarioBlocks + '\n\n' +
      'Compare these scenarios for Uzbekistan\'s policymakers.\n' +
      'Structure:\n' +
      '## Executive Summary\n(Which scenario is best and why, in 2-3 sentences)\n\n' +
      '## Key Findings\n(3-5 comparative observations)\n\n' +
      '## Risk Flags\n(2-3 risks across scenarios)\n\n' +
      '## Policy Recommendations\n(3-5 actionable items)\n';

    return _callLLM(systemMsg, userMsg)
      .then(function (text) {
        var parsed = _parseAnalysis(text);
        parsed.language = _config.language;
        parsed.model = _config.model;
        parsed.timestamp = _now();
        return parsed;
      })
      .catch(function (err) {
        /* Re-run without API key to get template fallback */
        var savedKey = _apiKey;
        _apiKey = null;
        var result = compareScenarios(scenarios);
        _apiKey = savedKey;
        return result.then(function (fallback) {
          fallback.fullText = '> AI comparison failed: ' + err.message + '\n\n' + fallback.fullText;
          fallback.model = 'template-fallback (API error)';
          return fallback;
        });
      });
  }

  /**
   * getApiStatus() — Check whether the advisor is configured.
   * @returns {Object} { configured, provider, model }
   */
  function getApiStatus() {
    return {
      configured: !!_apiKey,
      provider: _config.provider,
      model: _config.model
    };
  }

  /* ══════════════════════════════════════════════════════════
     UI Renderer
  ══════════════════════════════════════════════════════════ */

  /**
   * renderAdvisorPanel(containerId, analysis) — Render analysis as styled
   * HTML cards inside the given container element.
   *
   * @param {string} containerId  DOM element ID
   * @param {Object} analysis     Result from analyzeSim / generateNowcastBrief / compareScenarios
   */
  function renderAdvisorPanel(containerId, analysis) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('PolicyAdvisor: container "' + containerId + '" not found.');
      return;
    }

    /* Build section cards */
    var html = '';

    /* Wrapper styles */
    html += '<div style="' +
      'font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;' +
      'display: grid; gap: 16px; max-width: 900px;' +
      '">';

    /* Header bar */
    html += '<div style="' +
      'background: linear-gradient(135deg, ' + COLORS.navy + ', ' + COLORS.blue + ');' +
      'color: #fff; padding: 20px 24px; border-radius: 12px;' +
      'display: flex; align-items: center; justify-content: space-between;' +
      '">' +
      '<div style="display: flex; align-items: center; gap: 10px;">' +
      '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4a2 2 0 0 1-2-2 4 4 0 0 1 4-4z"/>' +
      '<path d="M8 8v1a4 4 0 0 0 8 0V8"/><path d="M12 13v9"/>' +
      '<path d="M7 17l5-4 5 4"/>' +
      '</svg>' +
      '<span style="font-size: 18px; font-weight: 600;">AI Policy Advisor</span>' +
      '</div>' +
      '<span style="font-size: 12px; opacity: 0.7;">' +
      _esc(analysis.model || 'unknown') + ' &middot; ' + _esc((analysis.timestamp || '').slice(0, 10)) +
      '</span>' +
      '</div>';

    /* Executive Summary card */
    html += _renderCard(
      'Executive Summary',
      '<p style="margin:0; line-height: 1.6; color: ' + COLORS.navy + ';">' + _esc(analysis.summary) + '</p>',
      COLORS.blue,
      /* icon: clipboard */
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>' +
      '<rect x="8" y="2" width="8" height="4" rx="1"/></svg>'
    );

    /* Key Findings card */
    html += _renderCard(
      'Key Findings',
      _renderList(analysis.findings, COLORS.teal),
      COLORS.teal,
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
    );

    /* Risk Flags card */
    html += _renderCard(
      'Risk Flags',
      _renderList(analysis.risks, COLORS.amber),
      COLORS.red,
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
      '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    );

    /* Policy Recommendations card */
    html += _renderCard(
      'Policy Recommendations',
      _renderList(analysis.recommendations, COLORS.green),
      COLORS.green,
      '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>' +
      '<polyline points="22 4 12 14.01 9 11.01"/></svg>'
    );

    html += '<div style="display:flex;justify-content:flex-end;">' +
      '<button id="advisor-publish-brief" style="' +
      'background:' + COLORS.blue + ';color:#fff;border:1px solid ' + COLORS.blue + ';' +
      'border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;' +
      '">Publish as Research Brief</button>' +
      '</div>';

    /* Close wrapper */
    html += '</div>';

    container.innerHTML = html;

    var publishBtn = document.getElementById('advisor-publish-brief');
    if (publishBtn) {
      publishBtn.addEventListener('click', function () {
        if (typeof global.publishAdvisorBriefFromPanel === 'function') {
          global.publishAdvisorBriefFromPanel(analysis);
        } else {
          alert('Publish action is not configured in this page.');
        }
      });
    }
  }

  /**
   * Render a single styled card section.
   * @param {string} title
   * @param {string} bodyHtml
   * @param {string} accentColor
   * @param {string} iconSvg
   * @returns {string} HTML string
   */
  function _renderCard(title, bodyHtml, accentColor, iconSvg) {
    return '<div style="' +
      'background: #fff;' +
      'border: 1px solid ' + COLORS.border + ';' +
      'border-left: 4px solid ' + accentColor + ';' +
      'border-radius: 12px;' +
      'padding: 20px 24px;' +
      'box-shadow: 0 1px 3px rgba(0,0,0,0.06);' +
      '">' +
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: ' + accentColor + ';">' +
      (iconSvg || '') +
      '<span style="font-size: 15px; font-weight: 600; color: ' + COLORS.navy + ';">' + _esc(title) + '</span>' +
      '</div>' +
      bodyHtml +
      '</div>';
  }

  /**
   * Render a styled bullet list.
   * @param {string[]} items
   * @param {string} bulletColor
   * @returns {string} HTML string
   */
  function _renderList(items, bulletColor) {
    if (!items || items.length === 0) return '<p style="margin:0; color: #64748b;">No items.</p>';

    var listItems = items.map(function (item) {
      return '<li style="' +
        'margin-bottom: 8px; line-height: 1.5; color: ' + COLORS.navy + ';' +
        'padding-left: 8px;' +
        '">' + _esc(item) + '</li>';
    }).join('');

    return '<ul style="' +
      'margin: 0; padding-left: 20px;' +
      'list-style: none;' +
      '">' +
      listItems.replace(/<li/g, '<li') +
      '</ul>' +
      '<style>' +
      '#pa-list-style { }' +
      '</style>';
  }

  /* ══════════════════════════════════════════════════════════
     Export as global object
  ══════════════════════════════════════════════════════════ */

  var PolicyAdvisor = {
    configure:          configure,
    analyzeSim:         analyzeSim,
    generateNowcastBrief: generateNowcastBrief,
    compareScenarios:   compareScenarios,
    getApiStatus:       getApiStatus,
    renderAdvisorPanel: renderAdvisorPanel
  };

  /* Expose on window for browser usage */
  if (typeof global.window !== 'undefined') {
    global.PolicyAdvisor = PolicyAdvisor;
  }

  /* CommonJS / Node compatibility (for testing) */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PolicyAdvisor;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
