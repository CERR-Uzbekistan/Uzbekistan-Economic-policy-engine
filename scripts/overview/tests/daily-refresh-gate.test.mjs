import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyGate, inspectDailyRefresh, WORKFLOW_PATH } from '../daily-refresh-gate.mjs'
const now='2026-10-19T06:00:00Z'
const valid={id:42,workflow_id:10,path:WORKFLOW_PATH,head_branch:'main',event:'workflow_dispatch',status:'completed',conclusion:'success',created_at:'2026-10-19T05:00:00Z',head_sha:'repair-plus',html_url:'https://github.com/example/run/42'}
function fixture({runs=[valid],cross=[],direct=valid,ancestry={status:'ahead',behind_by:0},jobs=true,state='active'}={}) {
  return async path=>{
    if(path.endsWith('/overview-artifact-refresh.yml'))return{id:10,path:WORKFLOW_PATH,state}
    if(path.includes('/compare/'))return ancestry
    if(path.includes('/jobs?'))return{jobs:[{name:'refresh-overview-artifact',conclusion:jobs?'success':'skipped',steps:jobs?[{name:'Reconcile reviewed official releases and archive source evidence',conclusion:'success'}]:[]}]}
    if(path.endsWith('/runs/42'))return direct
    if(path.includes('/workflows/10/runs?'))return{workflow_runs:runs}
    if(path.includes('/actions/runs?'))return{workflow_runs:cross}
    throw Error(`Unexpected fixture endpoint ${path}`)
  }
}
test('late schedule skips source acquisition after independently validated daily catch-up',async()=>{
  const gate=await dailyGate({api:fixture(),now,event:'schedule',runId:99})
  assert.equal(gate.shouldRefresh,false);assert.equal(gate.prior.runId,42);assert.equal(gate.prior.event,'workflow_dispatch')
})
test('repository cross-check finds a run omitted from workflow listing',async()=>{
  assert.equal((await inspectDailyRefresh(fixture({runs:[],cross:[valid]}),now)).status,'validated')
})
test('plain manual verification remains explicit and stale catch-up inputs fail',async()=>{
  const api=()=>{throw Error('must not query')}
  assert.equal((await dailyGate({api,now,event:'workflow_dispatch'})).shouldRefresh,true)
  await assert.rejects(dailyGate({api,now,event:'workflow_dispatch',catchupDate:'2026-10-18'}),/current Tashkent day/)
})
test('old day, PR, foreign workflow/branch, future and current runs cannot satisfy the gate',async()=>{
  for(const patch of [{created_at:'2026-10-18T05:00:00Z'},{event:'pull_request'},{path:'other.yml'},{head_branch:'other'},{workflow_id:11},{created_at:'2026-10-20T05:00:00Z'},{id:99}]){
    const gate=await dailyGate({api:fixture({runs:[{...valid,...patch}]}),now,event:'schedule',runId:99})
    assert.equal(gate.shouldRefresh,true)
  }
})
test('failed, unpatched and skipped-source runs are not daily validation',async()=>{
  for(const options of [{runs:[{...valid,conclusion:'failure'}]},{ancestry:{status:'diverged',behind_by:1}},{jobs:false}]){
    assert.equal((await inspectDailyRefresh(fixture(options),now)).status,'missing')
  }
})
test('direct run mismatch and disabled workflow fail closed',async()=>{
  await assert.rejects(inspectDailyRefresh(fixture({direct:{...valid,path:'other.yml'}}),now),/identity/)
  await assert.rejects(inspectDailyRefresh(fixture({state:'disabled_manually'}),now),/not active/)
})
test('an existing active run is reported separately from successful verification',async()=>{
  const active={...valid,status:'in_progress',conclusion:null}
  assert.equal((await inspectDailyRefresh(fixture({runs:[active]}),now)).status,'running')
})
