export type TrustStateLabelId =
  | 'mockFixture'
  | 'liveBridgeJson'
  | 'fallbackMock'
  | 'staticCuratedContent'
  | 'localBrowserDraft'
  | 'planned'
  | 'artifactGuardChecked'
  | 'sourceVintage'
  | 'artifactExport'
  | 'registryGenerated'
  | 'lastValidationCheck'
  | 'overviewArtifact'
  | 'staticOverviewFallback'

export type TrustStateTone = 'neutral' | 'info' | 'success' | 'warn'

export function getTrustStateLabelKey(id: TrustStateLabelId): string {
  return `trustState.labels.${id}`
}
