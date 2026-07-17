import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer.js'
import { PageHeader } from '../components/layout/PageHeader.js'
import type { DfmNowcastResult, IoDemandResult, QpmImpulseResult, PolicyChatParameter, PolicyChatProposal, PolicyChatRun } from '../contracts/policy-chat.js'
import { saveScenario } from '../state/scenarioStore.js'
import {
  editPolicyChatProposal,
  executePolicyChatProposal,
  PolicyChatApiError,
  proposePolicyChatRun,
} from '../data/policy-chat/client.js'
import './policy-chat.css'

type RequestState = 'idle' | 'interpreting' | 'updating' | 'running'

const STARTER_KEYS = ['monetary', 'demand', 'external'] as const

function editableValues(proposal: PolicyChatProposal): Record<string, number> {
  return Object.fromEntries(
    proposal.parameters
      .filter((parameter) => parameter.editable && typeof parameter.value === 'number')
      .map((parameter) => [parameter.key, parameter.value as number]),
  )
}

function formatParameterValue(parameter: PolicyChatParameter): string {
  if (typeof parameter.value === 'number') {
    if (parameter.key === 'base_year' || parameter.key === 'horizon') return String(parameter.value)
    return parameter.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return parameter.value.replaceAll('_', ' ')
}

function QpmResultFigure({ run }: { run: PolicyChatRun }) {
  const { t } = useTranslation()
  const paths = (run.normalized_result as QpmImpulseResult).irf_paths
  const series = [
    { id: 'output_gap', values: paths.output_gap, className: 'policy-chat-chart__line--output' },
    { id: 'inflation_yoy', values: paths.inflation_yoy, className: 'policy-chat-chart__line--inflation' },
    { id: 'policy_rate', values: paths.policy_rate, className: 'policy-chat-chart__line--rate' },
  ] as const
  const width = 720
  const height = 260
  const inset = 28
  const values = series.flatMap((item) => item.values)
  const maxAbs = Math.max(0.25, ...values.map((value) => Math.abs(value)))
  const count = Math.max(2, paths.output_gap.length)
  const x = (index: number) => inset + (index / (count - 1)) * (width - inset * 2)
  const y = (value: number) => height / 2 - (value / maxAbs) * (height / 2 - inset)
  const points = (path: number[]) => path.map((value, index) => `${x(index)},${y(value)}`).join(' ')

  return (
    <figure className="policy-chat-chart">
      <figcaption>
        <strong>{t('policyChat.results.chartTitle')}</strong>
        <span>{t('policyChat.results.chartSubtitle')}</span>
      </figcaption>
      <div className="policy-chat-chart__legend" aria-label={t('policyChat.results.legendAria')}>
        {series.map((item) => (
          <span key={item.id} className={`policy-chat-chart__legend-item ${item.className}`}>
            {t(`policyChat.results.series.${item.id}`)}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="policy-chat-chart-title policy-chat-chart-desc"
      >
        <title id="policy-chat-chart-title">{t('policyChat.results.chartTitle')}</title>
        <desc id="policy-chat-chart-desc">{t('policyChat.results.chartDescription')}</desc>
        <line className="policy-chat-chart__grid" x1={inset} x2={width - inset} y1={height / 2} y2={height / 2} />
        <text className="policy-chat-chart__axis-label" x={inset} y={height - 5}>Q0</text>
        <text className="policy-chat-chart__axis-label" textAnchor="end" x={width - inset} y={height - 5}>
          Q{count - 1}
        </text>
        {series.map((item) => (
          <polyline
            key={item.id}
            className={`policy-chat-chart__line ${item.className}`}
            points={points(item.values)}
          />
        ))}
      </svg>
      <details className="policy-chat-chart__table-wrap">
        <summary>{t('policyChat.results.viewTable')}</summary>
        <div className="policy-chat-chart__table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('policyChat.results.quarter')}</th>
                {series.map((item) => <th scope="col" key={item.id}>{t(`policyChat.results.series.${item.id}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {paths.output_gap.map((_, index) => (
                <tr key={index}>
                  <th scope="row">Q{index}</th>
                  {series.map((item) => <td key={item.id}>{item.values[index]?.toFixed(3)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

function DfmResultTable({ run }: { run: PolicyChatRun }) {
  const { t } = useTranslation()
  const result = run.normalized_result as DfmNowcastResult
  return (
    <section className="policy-chat-model-result" aria-labelledby="policy-chat-dfm-title">
      <div className="policy-chat-kpi">
        <span>{t('policyChat.results.latestNowcast')}</span>
        <strong>{result.gdp_nowcast_yoy_pct.toFixed(2)}%</strong>
        <small>{t('policyChat.results.yearOnYear')}</small>
      </div>
      <h3 id="policy-chat-dfm-title">{t('policyChat.results.forecastHorizon')}</h3>
      <div className="policy-chat-chart__table-scroll">
        <table>
          <thead><tr><th scope="col">{t('policyChat.results.horizon')}</th><th scope="col">{t('policyChat.results.estimate')}</th><th scope="col">{t('policyChat.results.ci90')}</th></tr></thead>
          <tbody>{result.forecasts.map((item) => <tr key={item.horizon_months}><th scope="row">{item.horizon_months}</th><td>{item.gdp_yoy_pct.toFixed(2)}%</td><td>{item.ci_90[0].toFixed(2)}–{item.ci_90[1].toFixed(2)}%</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

function IoResultTable({ run }: { run: PolicyChatRun }) {
  const { t } = useTranslation()
  const result = run.normalized_result as IoDemandResult
  const metrics = [
    ['output', result.aggregate.total_output_effect_bln_uzs, t('policyChat.results.billionUzs')],
    ['valueAdded', result.aggregate.total_va_effect_bln_uzs, t('policyChat.results.billionUzs')],
    ['employment', result.aggregate.total_employment_effect_persons, t('policyChat.results.persons')],
    ['multiplier', result.aggregate.aggregate_multiplier, '×'],
  ] as const
  return (
    <section className="policy-chat-model-result" aria-labelledby="policy-chat-io-title">
      <h3 id="policy-chat-io-title">{t('policyChat.results.aggregateEffects')}</h3>
      <dl className="policy-chat-metrics">{metrics.map(([key, value, unit]) => <div key={key}><dt>{t(`policyChat.results.${key}`)}</dt><dd>{value.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span>{unit}</span></dd></div>)}</dl>
      <details className="policy-chat-chart__table-wrap">
        <summary>{t('policyChat.results.topSectors')}</summary>
        <div className="policy-chat-chart__table-scroll"><table><thead><tr><th scope="col">{t('policyChat.results.sector')}</th><th scope="col">{t('policyChat.results.output')}</th><th scope="col">{t('policyChat.results.valueAdded')}</th></tr></thead><tbody>{result.top_sectors.slice(0, 10).map((sector) => <tr key={sector.code}><th scope="row">{sector.code} · {sector.name}</th><td>{sector.output_effect_bln_uzs.toLocaleString()}</td><td>{sector.va_effect_bln_uzs.toLocaleString()}</td></tr>)}</tbody></table></div>
      </details>
    </section>
  )
}
export function PolicyChatPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null)
  const [proposal, setProposal] = useState<PolicyChatProposal | null>(null)
  const [run, setRun] = useState<PolicyChatRun | null>(null)
  const [draftValues, setDraftValues] = useState<Record<string, number>>({})
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isBusy = requestState !== 'idle'
  const isDirty = useMemo(() => {
    if (!proposal) return false
    return proposal.parameters.some(
      (parameter) => parameter.editable && draftValues[parameter.key] !== parameter.value,
    )
  }, [draftValues, proposal])

  async function submitPrompt(message: string) {
    const trimmed = message.trim()
    if (!trimmed || isBusy) return
    setSubmittedPrompt(trimmed)
    setPrompt('')
    setProposal(null)
    setRun(null)
    setErrorCode(null)
    setSaved(false)
    setRequestState('interpreting')
    try {
      const next = await proposePolicyChatRun(trimmed, i18n.language)
      setProposal(next)
      setDraftValues(editableValues(next))
    } catch (error) {
      setErrorCode(error instanceof PolicyChatApiError ? error.code : 'request_failed')
    } finally {
      setRequestState('idle')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitPrompt(prompt)
  }

  async function updateAssumptions() {
    if (!proposal || !isDirty || isBusy) return
    setErrorCode(null)
    setRequestState('updating')
    try {
      const next = await editPolicyChatProposal(proposal.proposal_id, draftValues)
      setProposal(next)
      setDraftValues(editableValues(next))
      setRun(null)
    } catch (error) {
      setErrorCode(error instanceof PolicyChatApiError ? error.code : 'request_failed')
    } finally {
      setRequestState('idle')
    }
  }

  async function runModel() {
    if (!proposal || isDirty || isBusy) return
    setErrorCode(null)
    setRequestState('running')
    try {
      setRun(await executePolicyChatProposal(proposal))
    } catch (error) {
      setErrorCode(error instanceof PolicyChatApiError ? error.code : 'request_failed')
    } finally {
      setRequestState('idle')
    }
  }

  function saveCompletedRun() {
    if (!run || !proposal) return
    const attribution = run.model_attribution[0]
    try {
      saveScenario({
        scenario_id: run.run_id,
        scenario_name: proposal.summary,
        scenario_type: run.model_id === 'dfm' ? 'baseline' : 'alternative',
        tags: ['policy-chat', run.model_id],
        description: run.explanation.summary,
        created_at: '', updated_at: '', created_by: '',
        assumptions: run.confirmed_parameters.map((parameter) => ({
          key: parameter.key,
          label: parameter.label,
          value: parameter.value,
          unit: parameter.unit ?? 'category',
          category: run.model_id === 'io' ? 'trade' : 'macro',
          technical_variable: parameter.key,
        })),
        model_ids: [run.model_id],
        data_version: attribution?.data_version ?? 'unknown',
        run_id: run.run_id,
        run_saved_at: run.completed_at,
        run_attribution: run.model_attribution,
      })
      setSaved(true)
    } catch {
      setErrorCode('scenario_save_failed')
    }
  }
  const errorMessage = errorCode
    ? t(`policyChat.errors.${errorCode}`, { defaultValue: t('policyChat.errors.request_failed') })
    : null

  return (
    <PageContainer className="policy-chat-page">
      <PageHeader
        title={t('pages.policyChat.title')}
        description={t('pages.policyChat.description')}
        meta={
          <>
            <span><strong>{t('policyChat.meta.scope')}</strong> {t('policyChat.meta.qpm')}</span>
            <span><strong>{t('policyChat.meta.control')}</strong> {t('policyChat.meta.confirmation')}</span>
          </>
        }
      />

      <div className="policy-chat-layout">
        <main className="policy-chat-thread" aria-label={t('policyChat.threadAria')}>
          {!submittedPrompt ? (
            <section className="policy-chat-empty">
              <p className="policy-chat-empty__kicker">{t('policyChat.empty.kicker')}</p>
              <h2>{t('policyChat.empty.title')}</h2>
              <p>{t('policyChat.empty.description')}</p>
              <div className="policy-chat-starters" aria-label={t('policyChat.empty.startersAria')}>
                {STARTER_KEYS.map((key) => {
                  const value = t(`policyChat.starters.${key}`)
                  return <button type="button" key={key} onClick={() => void submitPrompt(value)}>{value}</button>
                })}
              </div>
            </section>
          ) : (
            <div className="policy-chat-turns">
              <article className="policy-chat-message policy-chat-message--user">
                <p className="policy-chat-message__label">{t('policyChat.you')}</p>
                <p>{submittedPrompt}</p>
              </article>

              {requestState === 'interpreting' ? (
                <p className="policy-chat-status" role="status">{t('policyChat.status.interpreting')}</p>
              ) : null}

              {proposal ? (
                <section className="policy-chat-proposal" aria-labelledby="policy-chat-proposal-title">
                  <div className="policy-chat-section-head">
                    <div>
                      <p className="policy-chat-message__label">{t('policyChat.proposal.label')}</p>
                      <h2 id="policy-chat-proposal-title">{t('policyChat.proposal.title')}</h2>
                    </div>
                    <span className="policy-chat-model-mark">{proposal.model_id === 'io' ? 'I-O' : proposal.model_id.toUpperCase()}</span>
                  </div>
                  <p className="policy-chat-proposal__summary">{proposal.summary}</p>
                  <div className="policy-chat-assumptions">
                    {proposal.parameters.map((parameter) => (
                      <div className="policy-chat-assumption" key={parameter.key}>
                        <div>
                          <label htmlFor={`policy-chat-${parameter.key}`}>
                            {t(`policyChat.parameters.${parameter.key}`, { defaultValue: parameter.label })}
                          </label>
                          <span>{t(`policyChat.origins.${parameter.origin}`)}</span>
                        </div>
                        {parameter.editable && typeof parameter.value === 'number' ? (
                          <div className="policy-chat-assumption__input">
                            <input
                              id={`policy-chat-${parameter.key}`}
                              type="number"
                              min={parameter.allowed_range?.min}
                              max={parameter.allowed_range?.max}
                              step={parameter.key === 'horizon' ? 1 : 0.25}
                              value={draftValues[parameter.key] ?? parameter.value}
                              onChange={(event) => setDraftValues((current) => ({
                                ...current,
                                [parameter.key]: Number(event.target.value),
                              }))}
                              disabled={isBusy}
                            />
                            <span>{t(`policyChat.units.${parameter.key}`, { defaultValue: parameter.unit ?? '' })}</span>
                          </div>
                        ) : (
                          <strong id={`policy-chat-${parameter.key}`}>{t(`policyChat.values.${String(parameter.value)}`, { defaultValue: formatParameterValue(parameter) })}</strong>
                        )}
                      </div>
                    ))}
                  </div>
                  {proposal.warnings.map((warning) => (
                    <p className="policy-chat-warning" key={warning.code}>{warning.message}</p>
                  ))}
                  <p className="policy-chat-caveat">{proposal.caveat}</p>
                  <div className="policy-chat-actions">
                    {isDirty ? (
                      <button type="button" className="btn-secondary" onClick={() => void updateAssumptions()} disabled={isBusy}>
                        {requestState === 'updating' ? t('policyChat.actions.updating') : t('policyChat.actions.update')}
                      </button>
                    ) : null}
                    <button type="button" className="btn-primary" onClick={() => void runModel()} disabled={isBusy || isDirty}>
                      {requestState === 'running' ? t('policyChat.actions.running') : t('policyChat.actions.run')}
                    </button>
                  </div>
                  {isDirty ? <p className="policy-chat-dirty" role="status">{t('policyChat.proposal.dirty')}</p> : null}
                </section>
              ) : null}

              {run ? (
                <article className="policy-chat-result" aria-labelledby="policy-chat-result-title">
                  <p className="policy-chat-message__label">{t('policyChat.results.label')}</p>
                  <h2 id="policy-chat-result-title">{proposal?.model_name} · {t('policyChat.results.title')}</h2>
                  <p className="policy-chat-result__summary">{run.explanation.summary}</p>
                  {run.model_id === 'qpm' ? <QpmResultFigure run={run} /> : null}
                  {run.model_id === 'dfm' ? <DfmResultTable run={run} /> : null}
                  {run.model_id === 'io' ? <IoResultTable run={run} /> : null}
                  <section>
                    <h3>{t('policyChat.results.interpretation')}</h3>
                    {run.explanation.interpretation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </section>
                  <section className="policy-chat-limitations">
                    <h3>{t('policyChat.results.limitations')}</h3>
                    <ul>{run.explanation.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                  <div className="policy-chat-result-actions">
                    <button type="button" className="btn-secondary" onClick={saveCompletedRun} disabled={saved}>{saved ? t('policyChat.actions.saved') : t('policyChat.actions.save')}</button>
                    <button type="button" className="btn-primary" onClick={() => navigate('/scenario-lab')} disabled={!saved}>{t('policyChat.actions.openLab')}</button>
                  </div>
                </article>
              ) : null}

              {errorMessage ? (
                <div className="policy-chat-error" role="alert">
                  <strong>{t('policyChat.errors.title')}</strong>
                  <p>{errorMessage}</p>
                </div>
              ) : null}
            </div>
          )}

          <form className="policy-chat-composer" onSubmit={handleSubmit}>
            <label htmlFor="policy-chat-prompt">{t('policyChat.composer.label')}</label>
            <textarea
              id="policy-chat-prompt"
              rows={3}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t('policyChat.composer.placeholder')}
              disabled={isBusy}
            />
            <div>
              <p>{t('policyChat.composer.notice')}</p>
              <button className="btn-primary" type="submit" disabled={isBusy || prompt.trim().length < 3}>
                {t('policyChat.composer.action')}
              </button>
            </div>
          </form>
        </main>

        <aside className="policy-chat-ledger" aria-labelledby="policy-chat-ledger-title">
          <div>
            <p className="policy-chat-message__label">{t('policyChat.ledger.kicker')}</p>
            <h2 id="policy-chat-ledger-title">{t('policyChat.ledger.title')}</h2>
          </div>
          <dl>
            <div><dt>{t('policyChat.ledger.model')}</dt><dd>{proposal?.model_name ?? t('policyChat.ledger.notSelected')}</dd></div>
            <div><dt>{t('policyChat.ledger.state')}</dt><dd>{run ? t('policyChat.ledger.complete') : proposal ? (isDirty ? t('policyChat.ledger.edited') : t('policyChat.ledger.review')) : t('policyChat.ledger.waiting')}</dd></div>
            <div><dt>{t('policyChat.ledger.confirmation')}</dt><dd>{run ? t('policyChat.ledger.confirmed') : t('policyChat.ledger.required')}</dd></div>
            <div><dt>{t('policyChat.ledger.data')}</dt><dd>{run?.model_attribution[0]?.data_version ?? t('policyChat.ledger.pending')}</dd></div>
          </dl>
          <p>{t('policyChat.ledger.disclosure')}</p>
        </aside>
      </div>
    </PageContainer>
  )
}
