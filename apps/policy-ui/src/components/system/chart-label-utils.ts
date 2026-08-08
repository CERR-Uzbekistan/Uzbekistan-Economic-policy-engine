/**
 * Converts ASCII methodology labels to their Unicode-rendered form
 * for user-visible display. Raw ASCII is preserved in data flow
 * (diff-stable, byte-stable across bridge JSON updates); Unicode
 * rendering is a view-layer concern invoked at display sites.
 *
 * Platform convention: ChartSpec.uncertainty[*].methodology_label
 * carries ASCII throughout the data layer. ChartRenderer invokes
 * this helper at any site that surfaces the label to users
 * (tooltip, caption, legend). Other consumers (logs, debug output,
 * exports) hold ASCII.
 */
export function prettyPrintMethodologyLabel(raw: string): string {
  return raw
    .replace(/\bsqrt\(/g, '√(')
    .replace(/\bsigma\b/g, 'σ')
    .replace(/ \* /g, ' × ')
}
