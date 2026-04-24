import { useTranslation } from 'react-i18next'
import type { ModelCaveat } from '../../contracts/data-contract'

type CaveatListProps = {
  caveats: ModelCaveat[]
}

export function CaveatList({ caveats }: CaveatListProps) {
  const { t } = useTranslation()
  if (caveats.length === 0) {
    return <p className="empty-state">{t('modelExplorer.caveats.empty')}</p>
  }
  return (
    <ul className="caveat-list">
      {caveats.map((caveat) => {
        const issueRefs = caveat.issue_refs ?? []
        const targetVersion = caveat.target_version
        return (
          <li key={caveat.id} className={`caveat-item severity-${caveat.severity}`}>
            <strong>
              {caveat.number} · {caveat.title}
            </strong>
            {caveat.body}
            {issueRefs.length > 0 ? (
              <>
                {' '}
                <span className="caveat-item__refs">
                  {t('modelExplorer.caveats.trackedPrefix')} {issueRefs.join(', ')}
                  {targetVersion ? <>. {t('modelExplorer.caveats.target', { version: targetVersion })}</> : null}
                </span>
              </>
            ) : targetVersion ? (
              <>
                {' '}
                <span className="caveat-item__refs">
                  {t('modelExplorer.caveats.target', { version: targetVersion })}
                </span>
              </>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
