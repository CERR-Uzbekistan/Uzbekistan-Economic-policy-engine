import { useTranslation } from 'react-i18next'
import type { ModelBridgeEvidence } from '../../contracts/data-contract'

type BridgeEvidencePanelProps = {
  evidence?: ModelBridgeEvidence
}

export function BridgeEvidencePanel({ evidence }: BridgeEvidencePanelProps) {
  const { t } = useTranslation()
  if (!evidence) return null

  const sourceCoverage =
    evidence.source_artifact.includes('io_model') || evidence.source_artifact.includes('mcp_server')
      ? t('modelExplorer.bridgeEvidence.sourceCoverageIo')
      : evidence.source_artifact
  const caveats = evidence.caveats.map((caveat) =>
    caveat.replace(/\bbridge payload\b/gi, t('modelExplorer.bridgeEvidence.publishedDataFile')),
  )
  const facts = [
    [t('modelExplorer.bridgeEvidence.sourceArtifact'), sourceCoverage],
    [t('modelExplorer.bridgeEvidence.dataVintage'), evidence.data_version],
    [t('modelExplorer.bridgeEvidence.exportedAt'), evidence.exported_at],
    [t('modelExplorer.bridgeEvidence.solverVersion'), evidence.solver_version],
    ...(typeof evidence.sector_count === 'number'
      ? [[t('modelExplorer.bridgeEvidence.sectorCount'), String(evidence.sector_count)]]
      : []),
    ...(evidence.framework ? [[t('modelExplorer.bridgeEvidence.framework'), evidence.framework]] : []),
    ...(evidence.units ? [[t('modelExplorer.bridgeEvidence.units'), evidence.units]] : []),
    ...(evidence.evidence_metrics ?? []).map((metric) => [metric.label, metric.value]),
  ]
  const linkageCounts = evidence.linkage_counts ?? []

  return (
    <section className="bridge-evidence" aria-label={t('modelExplorer.bridgeEvidence.title')}>
      <div className="bridge-evidence__head">
        <h4>{t('modelExplorer.bridgeEvidence.title')}</h4>
        <span className="bridge-evidence__status">{evidence.status_label}</span>
      </div>
      <dl className="bridge-evidence__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {linkageCounts.length > 0 ? (
        <>
          <h5>{t('modelExplorer.bridgeEvidence.linkageCounts')}</h5>
          <div className="bridge-evidence__linkages">
            {linkageCounts.map((item) => (
              <span key={item.label}>
                <b>{item.value}</b>
                {item.label}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {caveats.length > 0 ? (
        <>
          <h5>{t('modelExplorer.bridgeEvidence.caveats')}</h5>
          <ul className="bridge-evidence__caveats">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
