import { useTranslation } from 'react-i18next'
import type { ModelBridgeEvidence } from '../../contracts/data-contract'

type BridgeEvidencePanelProps = {
  evidence?: ModelBridgeEvidence
}

export function BridgeEvidencePanel({ evidence }: BridgeEvidencePanelProps) {
  const { t } = useTranslation()
  if (!evidence) return null

  const facts = [
    [t('modelExplorer.bridgeEvidence.sourceArtifact'), evidence.source_artifact],
    [t('modelExplorer.bridgeEvidence.dataVintage'), evidence.data_version],
    [t('modelExplorer.bridgeEvidence.exportedAt'), evidence.exported_at],
    [t('modelExplorer.bridgeEvidence.solverVersion'), evidence.solver_version],
    [t('modelExplorer.bridgeEvidence.sectorCount'), String(evidence.sector_count)],
    [t('modelExplorer.bridgeEvidence.framework'), evidence.framework],
    [t('modelExplorer.bridgeEvidence.units'), evidence.units],
  ]

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
      <h5>{t('modelExplorer.bridgeEvidence.linkageCounts')}</h5>
      <div className="bridge-evidence__linkages">
        {evidence.linkage_counts.map((item) => (
          <span key={item.label}>
            <b>{item.value}</b>
            {item.label}
          </span>
        ))}
      </div>
      {evidence.caveats.length > 0 ? (
        <>
          <h5>{t('modelExplorer.bridgeEvidence.caveats')}</h5>
          <ul className="bridge-evidence__caveats">
            {evidence.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
