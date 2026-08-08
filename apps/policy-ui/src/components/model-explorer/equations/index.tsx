import type { ReactNode } from 'react'
import { qpmEquations } from './qpm-equations.js'

// Prompt §4.2: serializable contract + JSX-in-mock. The catalog entry's
// equations[*].id field keys into this registry at render time. Models whose
// equation sets are Shot 2 content carry stub JSX here — enough to render
// the 2-col body without an empty state.

const dfmEquations: Record<string, ReactNode> = {
  dfm_factor: (
    <>
      <em>f</em>
      <sub>t</sub> = φ·<em>f</em>
      <sub>t−1</sub> + η<sub>t</sub>
    </>
  ),
  dfm_obs: (
    <>
      <em>x</em>
      <sub>i,t</sub> = λ<sub>i</sub>·<em>f</em>
      <sub>t</sub> + ξ<sub>i,t</sub>
    </>
  ),
}

const peEquations: Record<string, ReactNode> = {
  pe_smart: (
    <>
      Δ<em>M</em>
      <sub>ij</sub> = <em>M</em>
      <sub>ij</sub>·ε·(Δ<em>t</em>
      <sub>ij</sub> / (1 + <em>t</em>
      <sub>ij</sub>))
    </>
  ),
}

const ioEquations: Record<string, ReactNode> = {
  io_leontief: (
    <>
      <em>x</em> = (<em>I</em> − <em>A</em>)
      <sup>−1</sup>·<em>y</em>
    </>
  ),
}

const cgeEquations: Record<string, ReactNode> = {
  cge_armington: (
    <>
      <em>Q</em> = <em>a</em>
      <sub>q</sub>·[<em>b</em>
      <sub>q</sub>·<em>M</em>
      <sup>−ρq</sup> + (1−<em>b</em>
      <sub>q</sub>)·<em>D</em>
      <sup>−ρq</sup>]
      <sup>−1/ρq</sup>
    </>
  ),
  cge_cet: (
    <>
      <em>X</em> = <em>a</em>
      <sub>t</sub>·[<em>b</em>
      <sub>t</sub>·<em>E</em>
      <sup>ρt</sup> + (1−<em>b</em>
      <sub>t</sub>)·<em>D</em>
      <sup>ρt</sup>]
      <sup>1/ρt</sup>
    </>
  ),
  cge_current_account: (
    <>
      <em>w</em>
      <sub>m</sub>·<em>M</em> − <em>w</em>
      <sub>e</sub>·<em>E</em> − <em>ft</em> − <em>re</em> = <em>B</em>
    </>
  ),
  cge_savings_investment: (
    <>
      <em>S</em> = <em>s</em>
      <sub>y</sub>·<em>Y</em> + <em>Er</em>·<em>B</em> + <em>S</em>
      <sub>g</sub>; <em>Z</em> = <em>S</em>/<em>P</em>
      <sub>t</sub>
    </>
  ),
}

const fppEquations: Record<string, ReactNode> = {
  fpp_ca_identity: (
    <>
      <em>CA</em> ≡ <em>S</em> − <em>I</em> = (<em>X</em> − <em>M</em>) + <em>NFI</em>
    </>
  ),
}

// Model-explorer page composes the JSX lookup map by model_id before passing
// equations to EquationBlock. Lookups miss render as an empty block which the
// component renders with a sentinel — see EquationBlock.
export const equationRegistry: Record<string, Record<string, ReactNode>> = {
  'qpm-uzbekistan': qpmEquations,
  'dfm-nowcast': dfmEquations,
  'pe-model': peEquations,
  'io-model': ioEquations,
  'cge-model': cgeEquations,
  'fpp-fiscal': fppEquations,
}
