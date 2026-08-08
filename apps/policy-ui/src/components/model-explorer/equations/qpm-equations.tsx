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
      <sub>2</sub>·<em>mci</em>
      <sub>t</sub> + <em>b</em>
      <sub>3</sub>·<em>gap</em>
      <sub>t</sub>* + ε<sub>t</sub>
      <sup>y</sup>
      <br />
      <em>mci</em>
      <sub>t</sub> = <em>b</em>
      <sub>4</sub>·<em>rrgap</em>
      <sub>t</sub> − (1−<em>b</em>
      <sub>4</sub>)·<em>z</em>
      <sub>t</sub>
    </>
  ),
  qpm_phillips: (
    <>
      π<sub>t</sub> = <em>a</em>
      <sub>1</sub>·π<sub>t−1</sub> + (1−<em>a</em>
      <sub>1</sub>)·π<sub>t+1</sub> + <em>a</em>
      <sub>2</sub>·<em>rmc</em>
      <sub>t</sub> + <em>a</em>
      <sub>4</sub>·<em>dpm</em>
      <sub>t</sub> + ε<sub>t</sub>
      <sup>π</sup>
      <br />
      <em>rmc</em>
      <sub>t</sub> = <em>a</em>
      <sub>3</sub>·<em>y</em>
      <sub>t</sub> + (1−<em>a</em>
      <sub>3</sub>)·<em>z</em>
      <sub>t</sub>
    </>
  ),
  qpm_taylor: (
    <>
      <em>rs</em>
      <sub>t</sub> = <em>g</em>
      <sub>1</sub>·<em>rs</em>
      <sub>t−1</sub> + (1−<em>g</em>
      <sub>1</sub>)·[π<sub>t+1</sub> + <em>g</em>
      <sub>2</sub>·π4<sub>t+4</sub> + <em>g</em>
      <sub>3</sub>·<em>y</em>
      <sub>t</sub>] + ε<sub>t</sub>
      <sup>rs</sup>
    </>
  ),
  qpm_uip: (
    <>
      <em>s</em>
      <sub>t</sub> = (1−<em>e</em>
      <sub>1</sub>)·<em>s</em>
      <sub>t+1</sub> + <em>e</em>
      <sub>1</sub>·<em>s</em>
      <sub>t−1</sub> − (<em>rs</em>
      <sub>t</sub> − ρ<sub>t</sub>) / 4 + ε<sub>t</sub>
      <sup>s</sup>
    </>
  ),
}
