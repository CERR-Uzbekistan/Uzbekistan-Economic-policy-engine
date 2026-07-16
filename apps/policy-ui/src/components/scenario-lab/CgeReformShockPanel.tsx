import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CgeControlId, CgeControlValues } from '../../data/bridge/cge-types.js'
import type { ScenarioLabCgeState } from '../../data/scenario-lab/cge-analytics-source.js'
import { CgeSolverError, runCgeScenario } from '../../data/scenario-lab/cge-solver.js'

type Props = { state: ScenarioLabCgeState; onRetry: () => void }

const OUTPUTS = [
  ['E_pct_change', 'exports'],
  ['M_pct_change', 'imports'],
  ['Q_pct_change', 'compositeSupply'],
  ['Cn_pct_change', 'consumption'],
  ['Z_pct_change', 'investment'],
  ['TAX_pct_change', 'taxRevenue'],
  ['Sg_pct_change', 'governmentSaving'],
  ['Er_pct_change', 'relativePriceIndex'],
] as const

function format(value: number, language: string, digits = 2) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

export function CgeReformShockPanel({ state, onRetry }: Props) {
  const { t, i18n } = useTranslation()
  const [selectedPresetId, setSelectedPresetId] = useState('baseline')
  const [controls, setControls] = useState<CgeControlValues | null>(null)
  const effectiveControls = controls ?? (
    state.status === 'ready'
      ? state.payload.presets.find((preset) => preset.preset_id === 'baseline')?.controls ?? null
      : null
  )

  const result = useMemo(() => {
    if (state.status !== 'ready' || !effectiveControls) return null
    try {
      return { value: runCgeScenario(state.payload, effectiveControls), error: null }
    } catch (error) {
      return {
        value: null,
        error: error instanceof CgeSolverError ? error.message : t('scenarioLab.cgeShock.errors.failed'),
      }
    }
  }, [effectiveControls, state, t])

  if (state.status === 'loading') {
    return <section className="scenario-panel cge-shock"><p className="empty-state">{t('scenarioLab.cgeShock.loading')}</p></section>
  }
  if (state.status === 'error') {
    return (
      <section className="scenario-panel cge-shock">
        <p className="error-state">{state.error}</p>
        <button className="btn" type="button" onClick={onRetry}>{t('buttons.retry')}</button>
      </section>
    )
  }

  const payload = state.payload
  const maxMagnitude = Math.max(...OUTPUTS.map(([key]) => Math.abs(result?.value?.changes_from_base[key] ?? 0)), 0.01)
  function applyPreset(presetId: string) {
    const preset = payload.presets.find((entry) => entry.preset_id === presetId)
    if (!preset) return
    setSelectedPresetId(presetId)
    setControls(preset.controls)
  }
  function changeControl(id: CgeControlId, value: number) {
    setSelectedPresetId('custom')
    setControls((current) => ({ ...(current ?? effectiveControls ?? {} as CgeControlValues), [id]: value }))
  }

  return (
    <section className="scenario-panel cge-shock" id="scenario-model-tabpanel-cge_reform_shock" role="tabpanel" aria-labelledby="scenario-model-tab-cge_reform_shock">
      <header className="cge-shock__header">
        <div>
          <p className="claim-label">{t('scenarioLab.cgeShock.eyebrow')}</p>
          <h2>{t('scenarioLab.cgeShock.title')}</h2>
          <p>{t('scenarioLab.cgeShock.description')}</p>
        </div>
        <span className="cge-shock__status">{t('scenarioLab.cgeShock.status')}</span>
      </header>

      <div className="cge-shock__workspace">
        <aside className="cge-shock__controls" aria-labelledby="cge-controls-title">
          <h3 id="cge-controls-title">{t('scenarioLab.cgeShock.setup')}</h3>
          <div className="cge-shock__presets" aria-label={t('scenarioLab.cgeShock.presets')}>
            {payload.presets.map((preset) => (
              <button key={preset.preset_id} type="button" className={selectedPresetId === preset.preset_id ? 'active' : ''} onClick={() => applyPreset(preset.preset_id)}>
                <strong>{t(`scenarioLab.cgeShock.preset.${preset.preset_id}.title`, { defaultValue: preset.title })}</strong>
                <span>{t(`scenarioLab.cgeShock.preset.${preset.preset_id}.description`, { defaultValue: preset.description })}</span>
              </button>
            ))}
          </div>
          {effectiveControls ? payload.controls.map((definition) => (
            <label className="cge-shock__control" key={definition.id}>
              <span><strong>{t(`scenarioLab.cgeShock.controls.${definition.id}`)}</strong><b>{format(effectiveControls[definition.id], i18n.language)} {definition.unit}</b></span>
              <input type="range" min={definition.min} max={definition.max} step="any" value={effectiveControls[definition.id]} onChange={(event) => changeControl(definition.id, Number(event.target.value))} />
              <input type="number" min={definition.min} max={definition.max} step="any" value={effectiveControls[definition.id]} onChange={(event) => changeControl(definition.id, Number(event.target.value))} />
            </label>
          )) : null}
          <p className="cge-shock__boundary">{t('scenarioLab.cgeShock.boundary')}</p>
        </aside>

        <div className="cge-shock__results">
          <section className="cge-shock__decision">
            <div>
              <p className="claim-label">{t('scenarioLab.cgeShock.decisionView')}</p>
              <h3>{t('scenarioLab.cgeShock.resultTitle')}</h3>
              <p>{t('scenarioLab.cgeShock.resultDescription', { year: payload.metadata.base_year })}</p>
            </div>
            <dl className="cge-shock__headline">
              {OUTPUTS.slice(0, 4).map(([key, label]) => {
                const value = result?.value?.changes_from_base[key] ?? 0
                return <div key={key}><dt>{t(`scenarioLab.cgeShock.outputs.${label}`)}</dt><dd>{value > 0 ? '+' : ''}{format(value, i18n.language)}%</dd></div>
              })}
            </dl>
          </section>

          {result?.error ? <p className="error-state">{result.error}</p> : null}
          {result?.value ? (
            <section className="cge-shock__effects" aria-labelledby="cge-effects-title">
              <div className="cge-shock__section-head">
                <h3 id="cge-effects-title">{t('scenarioLab.cgeShock.effectsTitle')}</h3>
                <p>{t('scenarioLab.cgeShock.effectsDescription')}</p>
              </div>
              <ul>
                {OUTPUTS.map(([key, label]) => {
                  const value = result.value.changes_from_base[key]
                  return (
                    <li key={key}>
                      <span>{t(`scenarioLab.cgeShock.outputs.${label}`)}</span>
                      <div className="cge-shock__bar" aria-hidden="true">
                        <i
                          className={value < 0 ? 'negative' : 'positive'}
                          style={{ width: `${Math.max(1, Math.abs(value) / maxMagnitude * 50)}%` }}
                        />
                      </div>
                      <strong>{value > 0 ? '+' : ''}{format(value, i18n.language)}%</strong>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <section className="cge-shock__evidence">
            <div className="cge-shock__section-head">
              <h3>{t('scenarioLab.cgeShock.evidenceTitle')}</h3>
              <p>{t('scenarioLab.cgeShock.evidenceDescription')}</p>
            </div>
            <ul>
              {payload.benchmarks.map((benchmark) => (
                <li key={benchmark.benchmark_id}>
                  <strong>{t('scenarioLab.cgeShock.benchmark.' + benchmark.benchmark_id + '.title', { defaultValue: benchmark.title })}</strong>
                  <span>{t('scenarioLab.cgeShock.exactMatch')} · {benchmark.source_file}</span>
                  <small>{t('scenarioLab.cgeShock.benchmark.' + benchmark.benchmark_id + '.note', { defaultValue: benchmark.note })}</small>
                </li>
              ))}
            </ul>
          </section>

          <details className="cge-shock__caveats">
            <summary>{t('scenarioLab.cgeShock.caveats')}</summary>
            <ul>{payload.caveats.map((caveat, index) => <li key={caveat}>{t('scenarioLab.cgeShock.caveat.' + index, { defaultValue: caveat })}</li>)}</ul>
            <p>{t('scenarioLab.cgeShock.excludedSources')}</p>
            <ul>{payload.excluded_sources.map((source, index) => <li key={source.source_file}><strong>{source.source_file}</strong>: {t('scenarioLab.cgeShock.excluded.' + index, { defaultValue: source.reason })}</li>)}</ul>
          </details>
        </div>
      </div>
    </section>
  )
}
