import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  toModelExplorerWorkspace,
  type RawModelExplorerPayload,
} from '../../../src/data/adapters/model-explorer.js'
import { validateRawModelExplorerPayload } from '../../../src/data/adapters/model-explorer-guard.js'

function isIsoDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

describe('model explorer adapter', () => {
  it('maps metadata payload into the Model Explorer workspace contract', () => {
    const raw: RawModelExplorerPayload = {
      workspaceId: 'mx-1',
      generatedAt: '2026-04-18T10:00:00+05:00',
      defaultModelId: 'qpm',
      catalog: [
        {
          id: 'qpm',
          name: 'QPM',
          type: 'Semi-structural',
          frequency: 'Quarterly',
          status: 'active',
          summary: 'Summary',
        },
      ],
      metadataByModelId: {
        qpm: {
          modelId: 'qpm',
          overview: 'Overview',
          assumptions: [{ id: 'a1', label: 'Assumption', value: '1', rationale: 'Because' }],
          equations: [{ id: 'e1', title: 'Eq', expression: 'x=1', explanation: 'Simple' }],
          caveats: [{ id: 'c1', severity: 'warning', message: 'Caveat', implication: 'Implication' }],
          dataSources: [
            {
              id: 'd1',
              name: 'Dataset',
              provider: 'Provider',
              frequency: 'Monthly',
              vintage: '2026-04',
              note: 'Note',
            },
          ],
        },
      },
    }

    const workspace = toModelExplorerWorkspace(raw)

    assert.equal(workspace.workspace_id, 'mx-1')
    assert.equal(workspace.default_model_id, 'qpm')
    assert.equal(workspace.models[0].status, 'active')
    assert.equal(workspace.details_by_model_id.qpm.assumptions[0].assumption_id, 'a1')
    assert.equal(workspace.details_by_model_id.qpm.equations[0].equation_id, 'e1')
    assert.equal(workspace.details_by_model_id.qpm.caveats[0].severity, 'warning')
    assert.equal(workspace.details_by_model_id.qpm.data_sources[0].source_id, 'd1')
  })

  it('applies fallback defaults for missing and invalid enum fields', () => {
    const workspace = toModelExplorerWorkspace({
      generatedAt: 'bad-date',
      defaultModelId: 'missing-model',
      catalog: [{ id: 'm1', status: 'not-valid' }],
    })

    assert.equal(isIsoDateString(workspace.generated_at), true)
    assert.equal(workspace.default_model_id, 'm1')
    assert.equal(workspace.models[0].status, 'staging')
    assert.equal(workspace.details_by_model_id.m1.caveats.length, 0)
  })
})

describe('model explorer runtime guard', () => {
  it('fails validation for non-object payload', () => {
    const result = validateRawModelExplorerPayload('invalid')
    assert.equal(result.ok, false)
    assert.equal(
      result.issues.some((issue) => issue.severity === 'error'),
      true,
    )
  })

  it('keeps valid object payload and reports warnings for bad nested types', () => {
    const result = validateRawModelExplorerPayload({
      workspaceId: 'mx-1',
      catalog: 'bad-type',
      metadataByModelId: {
        qpm: {
          assumptions: [1, { id: 'a1', label: 'Label' }],
        },
      },
    })

    assert.equal(result.ok, true)
    assert.equal(result.value.workspaceId, 'mx-1')
    assert.ok(result.issues.length > 0)
    assert.equal(Array.isArray(result.value.metadataByModelId?.qpm.assumptions), true)
  })
})
