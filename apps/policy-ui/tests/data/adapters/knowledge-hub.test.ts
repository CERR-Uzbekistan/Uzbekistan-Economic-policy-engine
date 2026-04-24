import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toKnowledgeHubContent } from '../../../src/data/adapters/knowledge-hub.js'
import { knowledgeHubContentMock } from '../../../src/data/mock/knowledge-hub.js'

describe('knowledge hub adapter', () => {
  it('maps raw payload into KnowledgeHubContent shape', () => {
    const raw = {
      meta: { reforms_tracked: 2, research_briefs: 1, literature_items: 5 },
      reforms: [
        {
          id: 'r-1',
          date_label: '10 Jan 2026',
          status: 'in_progress',
          title: 'Reform 1',
          mechanism: 'Mechanism',
          domain_tag: 'Trade',
          model_refs: ['PE', 'CGE'],
        },
      ],
      briefs: [
        {
          id: 'b-1',
          byline: { ai_drafted: true, reviewed_by: 'CERR', date_label: '05 Mar' },
          title: 'Brief 1',
          summary: 'Summary',
          model_refs: ['QPM'],
        },
      ],
    }
    const content = toKnowledgeHubContent(raw)

    assert.equal(content.reforms.length, 1)
    assert.equal(content.reforms[0].status, 'in_progress')
    assert.deepEqual(content.reforms[0].model_refs, ['PE', 'CGE'])
    assert.equal(content.briefs.length, 1)
    assert.equal(content.briefs[0].byline.ai_drafted, true)
    assert.equal(content.briefs[0].byline.reviewed_by, 'CERR')
    assert.equal(content.meta.literature_items, 5)
  })

  it('defaults status to planned and applies safe fallbacks on missing fields', () => {
    const content = toKnowledgeHubContent({
      reforms: [{}],
      briefs: [{}],
    })

    assert.equal(content.reforms[0].status, 'planned')
    assert.equal(content.reforms[0].title, 'Untitled reform')
    assert.equal(content.briefs[0].title, 'Untitled brief')
    assert.equal(content.briefs[0].byline.ai_drafted, false)
  })

  it('prototype seed mock carries 4 reforms, 3 briefs, one AI-drafted brief', () => {
    assert.equal(knowledgeHubContentMock.reforms.length, 4)
    assert.equal(knowledgeHubContentMock.briefs.length, 3)
    const aiDrafted = knowledgeHubContentMock.briefs.filter((brief) => brief.byline.ai_drafted)
    assert.equal(aiDrafted.length, 1)
    assert.equal(aiDrafted[0].byline.reviewed_by, 'CERR Trade Desk')
    const planned = knowledgeHubContentMock.reforms.filter((reform) => reform.status === 'planned')
    assert.equal(planned.length, 1)
    assert.equal(planned[0].title, 'WTO accession · final tariff schedule')
  })
})
