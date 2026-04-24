import type { ReactNode } from 'react'

// JSX-in-mock sidecar per prompt §4.2. Equation identifiers match
// ModelCatalogEntry.equations[*].id for the QPM catalog entry.
export const qpmEquations: Record<string, ReactNode> = {
  qpm_is: (
    <>
      <em>y</em>
      <sub>t</sub> = <em>b</em>
      <sub>1</sub>·<em>y</em>
      <sub>t−1</sub> − <em>b</em>
      <sub>2</sub>·(<em>r</em>
      <sub>t</sub> − <em>r̄</em>) + <em>b</em>
      <sub>3</sub>·<em>y</em>
      <sub>t</sub>* + ε<sub>t</sub>
      <sup>y</sup>
    </>
  ),
  qpm_phillips: (
    <>
      π<sub>t</sub> = <em>a</em>
      <sub>1</sub>·π<sub>t−1</sub> + <em>a</em>
      <sub>2</sub>·<em>rmc</em>
      <sub>t</sub> + <em>a</em>
      <sub>3</sub>·Δ<em>s</em>
      <sub>t</sub> + ε<sub>t</sub>
      <sup>π</sup>
    </>
  ),
  qpm_taylor: (
    <>
      <em>i</em>
      <sub>t</sub> = ρ·<em>i</em>
      <sub>t−1</sub> + (1−ρ)·[<em>r̄</em> + π<sub>t+1</sub>
      <sup>e</sup> + γ<sub>π</sub>·(π<sub>t+1</sub>
      <sup>e</sup> − π̄) + γ<sub>y</sub>·<em>y</em>
      <sub>t</sub>]
    </>
  ),
  qpm_uip: (
    <>
      <em>s</em>
      <sub>t</sub> = <em>s</em>
      <sub>t+1</sub>
      <sup>e</sup> − (<em>i</em>
      <sub>t</sub> − <em>i</em>
      <sub>t</sub>*) / 4 + ε<sub>t</sub>
      <sup>s</sup>
    </>
  ),
}
