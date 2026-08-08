const PACKAGE_ID_FIELD = 'package_id'
const PACKAGE_STAGE_FIELD = 'current_stage'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeSourceEvents(packageEntry) {
  return asArray(packageEntry?.official_source_events)
    .map((event) => ({
      title: text(event.title),
      source_institution: text(event.source_institution),
      source_url: text(event.source_url),
      source_url_status: text(event.source_url_status),
    }))
    .sort((left, right) => {
      const leftKey = `${left.source_url}|${left.title}|${left.source_institution}|${left.source_url_status}`
      const rightKey = `${right.source_url}|${right.title}|${right.source_institution}|${right.source_url_status}`
      return leftKey.localeCompare(rightKey)
    })
}

function normalizeDiagnostic(diagnostic) {
  return {
    id: text(diagnostic?.id),
    institution: text(diagnostic?.institution),
    url: text(diagnostic?.url),
    parser: text(diagnostic?.parser),
    fetch_url: text(diagnostic?.fetch_url),
    ok: Boolean(diagnostic?.ok),
    candidate_count: Number(diagnostic?.candidate_count ?? 0),
    excluded_count: Number(diagnostic?.excluded_count ?? 0),
    link_invalid_count: Number(diagnostic?.link_invalid_count ?? 0),
    error: text(diagnostic?.error),
  }
}

function byId(entries, idField) {
  return new Map(asArray(entries).map((entry) => [text(entry?.[idField]), entry]).filter(([id]) => id))
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function describePackage(packageEntry) {
  return {
    package_id: text(packageEntry?.[PACKAGE_ID_FIELD]),
    title: text(packageEntry?.title),
  }
}

function compareField(previousValue, currentValue) {
  if (previousValue === currentValue) return null
  return { before: previousValue, after: currentValue }
}

function compareSourceDiagnostics(previousArtifact, currentArtifact) {
  const previousById = byId(previousArtifact?.source_diagnostics, 'id')
  const currentById = byId(currentArtifact?.source_diagnostics, 'id')
  const ids = [...new Set([...previousById.keys(), ...currentById.keys()])].sort()

  return ids
    .map((id) => {
      const previous = previousById.has(id) ? normalizeDiagnostic(previousById.get(id)) : null
      const current = currentById.has(id) ? normalizeDiagnostic(currentById.get(id)) : null

      if (!previous) return { id, change_type: 'added', before: null, after: current }
      if (!current) return { id, change_type: 'removed', before: previous, after: null }
      if (sameJson(previous, current)) return null

      const fields = {}
      for (const key of Object.keys(current)) {
        const change = compareField(previous[key], current[key])
        if (change) fields[key] = change
      }

      return { id, change_type: 'changed', fields }
    })
    .filter(Boolean)
}

function comparePackages(previousArtifact, currentArtifact) {
  const previousById = byId(previousArtifact?.reform_packages, PACKAGE_ID_FIELD)
  const currentById = byId(currentArtifact?.reform_packages, PACKAGE_ID_FIELD)
  const ids = [...new Set([...previousById.keys(), ...currentById.keys()])].sort()

  const added = []
  const removed = []
  const changed = []

  for (const id of ids) {
    const previous = previousById.get(id)
    const current = currentById.get(id)

    if (!previous) {
      added.push(describePackage(current))
      continue
    }

    if (!current) {
      removed.push(describePackage(previous))
      continue
    }

    const changes = {}
    const titleChange = compareField(text(previous.title), text(current.title))
    const stageChange = compareField(text(previous[PACKAGE_STAGE_FIELD]), text(current[PACKAGE_STAGE_FIELD]))
    const previousSources = normalizeSourceEvents(previous)
    const currentSources = normalizeSourceEvents(current)

    if (titleChange) changes.title = titleChange
    if (stageChange) changes.current_stage = stageChange
    if (!sameJson(previousSources, currentSources)) {
      changes.official_source_events = {
        before: previousSources,
        after: currentSources,
      }
    }

    if (Object.keys(changes).length > 0) {
      changed.push({
        package_id: id,
        title: text(current.title) || text(previous.title),
        changes,
      })
    }
  }

  return { added, removed, changed }
}

function invalidLinksBlocked(diagnostics) {
  return asArray(diagnostics?.source_results)
    .filter((source) => Number(source.link_invalid_count ?? 0) > 0)
    .map((source) => ({
      id: text(source.id),
      institution: text(source.institution),
      link_invalid_count: Number(source.link_invalid_count ?? 0),
      blocked_links: asArray(source.exclusions)
        .filter((exclusion) => text(exclusion.exclusion_reason) === 'source_link_unusable')
        .map((exclusion) => ({
          title: text(exclusion.title),
          source_url: text(exclusion.source_url),
          source_url_error: text(exclusion.source_url_error),
        })),
    }))
}

function sourceFailures(diagnostics) {
  return asArray(diagnostics?.source_failures).map((failure) => ({
    id: text(failure.id),
    institution: text(failure.institution),
    fetch_url: text(failure.fetch_url),
    error: text(failure.error),
  }))
}

export function buildKnowledgeHubChangeSummary(previousArtifact, currentArtifact, diagnostics, options = {}) {
  const packageChanges = comparePackages(previousArtifact, currentArtifact)
  const invalidLinks = invalidLinksBlocked(diagnostics)
  const failures = sourceFailures(diagnostics)

  return {
    previous_artifact_path: options.previousPath ?? null,
    current_artifact_path: options.currentPath ?? null,
    generated_at: currentArtifact?.generated_at ?? diagnostics?.artifact?.generated_at ?? null,
    package_count: {
      before: asArray(previousArtifact?.reform_packages).length,
      after: asArray(currentArtifact?.reform_packages).length,
    },
    added_packages: packageChanges.added,
    removed_packages: packageChanges.removed,
    changed_packages: packageChanges.changed,
    source_diagnostics_changes: compareSourceDiagnostics(previousArtifact, currentArtifact),
    invalid_links_blocked: {
      total: invalidLinks.reduce((sum, source) => sum + source.link_invalid_count, 0),
      sources: invalidLinks,
    },
    source_failures: {
      total: failures.length,
      failures,
    },
  }
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

function listPackages(packages) {
  if (packages.length === 0) return ['- None']
  return packages.map((packageEntry) => `- \`${packageEntry.package_id}\` - ${packageEntry.title || '(untitled)'}`)
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : JSON.stringify(value)
  if (value === '') return '(blank)'
  return String(value)
}

function listPackageChanges(changedPackages) {
  if (changedPackages.length === 0) return ['- None']

  return changedPackages.map((packageEntry) => {
    const fields = Object.entries(packageEntry.changes)
      .map(([field, change]) => `${field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`)
      .join('; ')
    return `- \`${packageEntry.package_id}\` - ${packageEntry.title || '(untitled)'} (${fields})`
  })
}

function listDiagnosticChanges(changes) {
  if (changes.length === 0) return ['- None']

  return changes.map((change) => {
    if (change.change_type !== 'changed') return `- \`${change.id}\` ${change.change_type}`

    const fields = Object.entries(change.fields)
      .map(([field, fieldChange]) => `${field}: ${formatValue(fieldChange.before)} -> ${formatValue(fieldChange.after)}`)
      .join('; ')
    return `- \`${change.id}\` changed (${fields})`
  })
}

function listInvalidLinks(invalidLinks) {
  if (invalidLinks.sources.length === 0) return ['- None']

  return invalidLinks.sources.map((source) => {
    const blocked = source.blocked_links
      .map((link) => `${link.source_url || '(missing URL)'}${link.source_url_error ? ` (${link.source_url_error})` : ''}`)
      .join('; ')
    return `- \`${source.id}\`: ${source.link_invalid_count} ${plural(source.link_invalid_count, 'link')} blocked${blocked ? ` - ${blocked}` : ''}`
  })
}

function listSourceFailures(sourceFailureSummary) {
  if (sourceFailureSummary.failures.length === 0) return ['- None']

  return sourceFailureSummary.failures.map(
    (failure) => `- \`${failure.id}\`${failure.fetch_url ? ` (${failure.fetch_url})` : ''}: ${failure.error || 'Unknown error'}`,
  )
}

export function renderKnowledgeHubChangeSummaryMarkdown(summary) {
  return [
    '## Change summary versus previous public artifact',
    '',
    `- Package count: ${summary.package_count.before} -> ${summary.package_count.after}`,
    `- Added packages: ${summary.added_packages.length}`,
    `- Removed packages: ${summary.removed_packages.length}`,
    `- Packages with title/stage/source changes: ${summary.changed_packages.length}`,
    `- Source diagnostics changes: ${summary.source_diagnostics_changes.length}`,
    `- Invalid links blocked: ${summary.invalid_links_blocked.total}`,
    `- Source failures: ${summary.source_failures.total}`,
    '',
    '### Added packages',
    ...listPackages(summary.added_packages),
    '',
    '### Removed packages',
    ...listPackages(summary.removed_packages),
    '',
    '### Package title/stage/source changes',
    ...listPackageChanges(summary.changed_packages),
    '',
    '### Source diagnostics changes',
    ...listDiagnosticChanges(summary.source_diagnostics_changes),
    '',
    '### Invalid links blocked',
    ...listInvalidLinks(summary.invalid_links_blocked),
    '',
    '### Source failures',
    ...listSourceFailures(summary.source_failures),
    '',
  ].join('\n')
}
