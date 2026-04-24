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
      <em>Q</em>
      <sub>i</sub> = <em>A</em>
      <sub>i</sub>·[δ<sub>i</sub>·<em>D</em>
      <sub>i</sub>
      <sup>ρ</sup> + (1−δ<sub>i</sub>)·<em>M</em>
      <sub>i</sub>
      <sup>ρ</sup>]
      <sup>1/ρ</sup>
    </>
  ),
  cge_cet: (
    <>
      <em>X</em>
      <sub>i</sub> = <em>B</em>
      <sub>i</sub>·[γ<sub>i</sub>·<em>E</em>
      <sub>i</sub>
      <sup>ω</sup> + (1−γ<sub>i</sub>)·<em>D</em>
      <sub>i</sub>
      <sup>ω</sup>]
      <sup>1/ω</sup>
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
