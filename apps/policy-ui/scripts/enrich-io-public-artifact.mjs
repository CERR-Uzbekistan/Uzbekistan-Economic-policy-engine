import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const publicIoPath = resolve(root, 'apps/policy-ui/public/data/io.json')
const mcpIoPath = resolve(root, 'mcp_server/data/io_data.json')

function normalizeCode(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}

const publicIo = JSON.parse(await readFile(publicIoPath, 'utf8'))
const mcpIo = JSON.parse(await readFile(mcpIoPath, 'utf8'))

if (!Array.isArray(publicIo.sectors) || !Array.isArray(mcpIo.codes)) {
  throw new Error('Unexpected I-O artifact shape.')
}

if (publicIo.sectors.length !== mcpIo.codes.length) {
  throw new Error(`Sector length mismatch: public=${publicIo.sectors.length}, mcp=${mcpIo.codes.length}`)
}

for (let index = 0; index < publicIo.sectors.length; index += 1) {
  const publicCode = normalizeCode(publicIo.sectors[index].code)
  const mcpCode = normalizeCode(mcpIo.codes[index])
  if (publicCode !== mcpCode) {
    throw new Error(`Sector code mismatch at ${index}: public=${publicCode}, mcp=${mcpCode}`)
  }
  publicIo.sectors[index] = {
    ...publicIo.sectors[index],
    employment_total: mcpIo.EmpTotal[index],
    employment_formal: mcpIo.EmpFormal[index],
    employment_informal: mcpIo.EmpInformal[index],
  }
}

const caveats = publicIo.caveats.filter(
  (caveat) => caveat.caveat_id !== 'io-employment-mcp-source',
)
caveats.push({
  caveat_id: 'io-employment-mcp-source',
  severity: 'info',
  message:
    'Employment arrays are merged from the MCP-converted I-O source. Employment effects are linear employment-intensity estimates, not labor-market forecasts.',
  affected_metrics: ['employment_effect_persons'],
  affected_models: ['IO'],
})
publicIo.caveats = caveats

publicIo.metadata = {
  ...publicIo.metadata,
  source_artifact: 'io_model/io_data.json + mcp_server/data/io_data.json',
}

await writeFile(publicIoPath, `${JSON.stringify(publicIo, null, 2)}\n`, 'utf8')
