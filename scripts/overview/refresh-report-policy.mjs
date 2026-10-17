export function assertFullyValidatedRefresh(report) {
  if (report.status !== 'validated' || !report.families?.length ||
      report.families.some(family => family.status !== 'validated')) {
    const failures = (report.families ?? []).filter(family => family.status !== 'validated')
      .map(family => `${family.family}: ${family.reason ?? family.status}`)
    throw new Error(`Official refresh validation incomplete; previous published artifacts retained. ${failures.join('; ')}`)
  }
}
