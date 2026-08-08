import type {
  KnowledgeHubContent,
  KnowledgeHubContentLanguage,
  ReformPackage,
  ReformPackageDigest,
  ReformPackageSourceEvent,
} from '../../contracts/data-contract.js'
import { sortReformPackagesNewestFirst } from '../knowledge-hub/knowledge-hub-ordering.js'

type ReformPreviewItem = {
  id: string
  date: string
  institution: string
  title: string
  changed: string
}

function localizedText(
  values: Partial<Record<KnowledgeHubContentLanguage, string>> | undefined,
  language: KnowledgeHubContentLanguage,
): string | undefined {
  return values?.[language] ?? (language !== 'en' ? values?.en : undefined)
}

function localizedPackageDigest(
  reformPackage: ReformPackage,
  language: KnowledgeHubContentLanguage,
): ReformPackageDigest {
  return {
    ...reformPackage.digest,
    ...(reformPackage.localized?.digest?.[language] ?? {}),
  }
}

function sourceEventText(
  sourceEvent: ReformPackageSourceEvent | undefined,
  field: 'title' | 'summary' | 'source_url',
  language: KnowledgeHubContentLanguage,
): string | undefined {
  if (!sourceEvent) return undefined
  return localizedText(sourceEvent.localized?.[field], language) ?? sourceEvent[field]
}

export function buildKnowledgeHubReformPreview(
  content: KnowledgeHubContent | null,
  language: KnowledgeHubContentLanguage,
): ReformPreviewItem[] {
  if (!content?.reform_packages) {
    return []
  }

  return sortReformPackagesNewestFirst(content.reform_packages)
    .slice(0, 3)
    .map((reformPackage) => {
      const sourceEvent = reformPackage.official_source_events[0]
      const digest = localizedPackageDigest(reformPackage, language)
      return {
        id: reformPackage.package_id,
        date: reformPackage.current_stage_date,
        institution: sourceEvent?.source_institution ?? reformPackage.responsible_institutions[0] ?? '',
        title: localizedText(reformPackage.localized?.title, language) ?? reformPackage.title,
        changed:
          digest.changed ??
          sourceEventText(sourceEvent, 'summary', language) ??
          reformPackage.short_summary ??
          reformPackage.why_tracked,
      }
    })
}
