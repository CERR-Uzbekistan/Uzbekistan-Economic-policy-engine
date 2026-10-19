import { execFileSync } from 'node:child_process'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const REPOSITORY = 'CERR-Uzbekistan/Uzbekistan-Economic-policy-engine'
export const WORKFLOW_PATH = '.github/workflows/overview-artifact-refresh.yml'
const REPAIR = '5398e3fdb7dc95915367648984b34d25f683a743'
export const tashkentDate = now => new Date(Date.parse(now) + 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
export function githubApi(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024 }))
}

/** A successful PR, skipped job or older source repair cannot satisfy the daily check. */
export async function inspectDailyRefresh(api, now, { excludeRunId, knownRunId } = {}) {
  const date = tashkentDate(now)
  const start = Date.parse(`${date}T00:00:00+05:00`)
  const repo = `repos/${REPOSITORY}`
  const workflow = await api(`${repo}/actions/workflows/overview-artifact-refresh.yml`)
  if (workflow.state !== 'active' || workflow.path !== WORKFLOW_PATH) throw Error('Official refresh workflow is not active or has changed identity')
  const since = encodeURIComponent(`>=${new Date(start).toISOString()}`)
  const listed = await api(`${repo}/actions/workflows/${workflow.id}/runs?branch=main&created=${since}&per_page=100`)
  const cross = await api(`${repo}/actions/runs?branch=main&created=${since}&per_page=100`)
  const known = knownRunId ? [await api(`${repo}/actions/runs/${Number(knownRunId)}`)] : []
  const runs = [...new Map([...listed.workflow_runs, ...cross.workflow_runs, ...known].map(r => [r.id, r])).values()]
    .filter(r => r.id !== Number(excludeRunId) && r.path === WORKFLOW_PATH && r.workflow_id === workflow.id &&
      r.head_branch === 'main' && ['schedule', 'workflow_dispatch'].includes(r.event) &&
      Date.parse(r.created_at) >= start && Date.parse(r.created_at) <= Date.parse(now))
    .sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)
  for (const candidate of runs.filter(r => r.status === 'completed' && r.conclusion === 'success')) {
    const run = await api(`${repo}/actions/runs/${candidate.id}`)
    if (run.id !== candidate.id || run.workflow_id !== workflow.id || run.path !== WORKFLOW_PATH ||
        run.head_branch !== 'main' || !['schedule','workflow_dispatch'].includes(run.event) ||
        run.status !== 'completed' || run.conclusion !== 'success' ||
        Date.parse(run.created_at) < start || Date.parse(run.created_at) > Date.parse(now)) throw Error('Daily run direct identity mismatch')
    const ancestry = await api(`${repo}/compare/${REPAIR}...${run.head_sha}`)
    if (ancestry.behind_by !== 0 || !['ahead','identical'].includes(ancestry.status)) continue
    const jobs = await api(`${repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`)
    const validated = jobs.jobs.some(job => job.name === 'refresh-overview-artifact' && job.conclusion === 'success' &&
      job.steps?.some(step => step.name === 'Reconcile reviewed official releases and archive source evidence' && step.conclusion === 'success'))
    if (validated) return { date, status: 'validated', runId: run.id, event: run.event, headSha: run.head_sha, url: run.html_url }
  }
  const pending = runs.find(r => ['queued','in_progress','waiting','pending','requested'].includes(r.status))
  return { date, status: pending ? 'running' : 'missing', runId: pending?.id ?? null, url: pending?.html_url ?? null }
}

export async function dailyGate({ api = githubApi, now = new Date().toISOString(), event, catchupDate = '', runId } = {}) {
  const date = tashkentDate(now)
  if (catchupDate && catchupDate !== date) throw Error('Catch-up request date must match the current Tashkent day')
  if (event !== 'schedule' && !(event === 'workflow_dispatch' && catchupDate)) return { date, shouldRefresh: true, reason: 'explicit_manual_verification' }
  const prior = await inspectDailyRefresh(api, now, { excludeRunId: runId })
  return { date, shouldRefresh: prior.status !== 'validated', reason: prior.status === 'validated' ? 'already_validated_today' : 'daily_validation_required', prior,
    sourceValidationPerformed: false }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await dailyGate({ event: process.env.GITHUB_EVENT_NAME, catchupDate: process.env.REFRESH_CATCHUP_DATE, runId: process.env.GITHUB_RUN_ID })
  await mkdir('tmp', { recursive: true })
  await writeFile('tmp/overview-daily-gate.json', JSON.stringify(result, null, 2) + '\n')
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `should_refresh=${result.shouldRefresh}\n`)
  console.log(JSON.stringify(result, null, 2))
}
