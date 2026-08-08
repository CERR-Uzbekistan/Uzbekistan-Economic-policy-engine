import { useTranslation } from 'react-i18next'
import type { ComparisonSectorEvidence } from '../../contracts/data-contract'

type SectorEvidencePanelProps = {
  evidence: ComparisonSectorEvidence | null
}

export function SectorEvidencePanel({ evidence }: SectorEvidencePanelProps) {
  const { t } = useTranslation()
  if (!evidence) return null

  const sourceCoverage =
    evidence.source_artifact.includes('io_model') || evidence.source_artifact.includes('mcp_server')
      ? t('comparison.ioEvidence.sourceCoverageIo')
      : evidence.source_artifact
  const caveats = evidence.caveats.map((caveat) =>
    caveat.replace(/\bbridge payload\b/gi, t('comparison.ioEvidence.publishedDataFile')),
  )
  const facts = [
    [t('comparison.ioEvidence.sourceArtifact'), sourceCoverage],
    [t('comparison.ioEvidence.dataVintage'), evidence.data_vintage],
    [t('comparison.ioEvidence.exportedAt'), evidence.exported_at],
    [t('comparison.ioEvidence.sectorCount'), String(evidence.sector_count)],
    [t('comparison.ioEvidence.framework'), evidence.framework],
    [t('comparison.ioEvidence.units'), evidence.units],
  ]

  return (
    <aside className="cmp-io-evidence" aria-label={t('comparison.ioEvidence.title')}>
      <div className="cmp-io-evidence__head">
        <h4>{t('comparison.ioEvidence.title')}</h4>
        <span>{t('comparison.ioEvidence.status')}</span>
      </div>
      <p className="cmp-io-evidence__note">{t('comparison.ioEvidence.note')}</p>
      <dl className="cmp-io-evidence__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h5>{t('comparison.ioEvidence.linkageCounts')}</h5>
      <div className="cmp-io-evidence__linkages">
        {evidence.linkage_counts.map((item) => (
          <span key={item.classification}>
            <b>{item.value}</b>
            {t(`comparison.ioEvidence.linkageClass.${item.classification}`)}
          </span>
        ))}
      </div>
      {caveats.length > 0 ? (
        <>
          <h5>{t('comparison.ioEvidence.caveats')}</h5>
          <ul className="cmp-io-evidence__caveats">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  )
}
