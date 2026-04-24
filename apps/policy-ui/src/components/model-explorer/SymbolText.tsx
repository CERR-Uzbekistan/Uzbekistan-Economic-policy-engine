import { Fragment } from 'react'

type SymbolTextProps = {
  text: string
}

// Renders short identifier-style symbols with subscripts. Tokens after an
// underscore get wrapped in <sub>. Multiple underscores segment further (e.g.
// "γ_π" → γ<sub>π</sub>; "b_1" → b<sub>1</sub>).
export function SymbolText({ text }: SymbolTextProps) {
  const parts = text.split('_')
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>{index === 0 ? part : <sub>{part}</sub>}</Fragment>
      ))}
    </>
  )
}
