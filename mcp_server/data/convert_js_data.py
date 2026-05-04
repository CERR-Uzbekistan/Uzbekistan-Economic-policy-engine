"""One-time conversion: JavaScript data files -> JSON for the MCP server.

Usage:
    python convert_js_data.py

Converts:
    - dfm_nowcast/dfm_data.js -> data/dfm_data.json  (pure JSON after prefix strip)
    - pe_model/pe_data.js     -> data/pe_data.json    (JS object literal -> JSON via Node.js)
    - io_model/io_data.js     -> data/io_data.json    (JS object literal -> JSON via Node.js)

The DFM file contains valid JSON after stripping `window.DFM_DATA = `.
The PE and IO files use JS object notation (unquoted keys), so we use Node.js
to eval them and output valid JSON.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent  # mcp_server/data/ -> project root
DATA_OUT = Path(__file__).parent


def convert_with_node(src_path: Path, var_name: str, output_path: Path) -> bool:
    """Use Node.js to convert a JS data file to JSON.

    Loads the JS file, evaluates it, and writes the variable as JSON.
    """
    if not src_path.exists():
        print(f"  SKIP: {src_path} not found")
        return False

    # Create a temp Node script that requires the JS file and outputs JSON
    node_script = f"""
const fs = require('fs');
let code = fs.readFileSync({json.dumps(str(src_path))}, 'utf-8');
// Remove BOM
if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
// Create a sandbox with window/const support
const sandbox = {{}};
sandbox.window = sandbox;
const fn = new Function('window', 'const self = this; ' + code + '; return {var_name};');
const data = fn.call(sandbox, sandbox);
process.stdout.write(JSON.stringify(data));
"""
    try:
        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True, text=True, timeout=60,
            encoding="utf-8", errors="replace",
        )
        if result.returncode != 0:
            print(f"  ERROR: Node.js failed for {src_path.name}:")
            print(f"    {result.stderr[:500]}")
            return False

        # Validate and write
        data = json.loads(result.stdout)
        output_path.write_text(
            json.dumps(data, ensure_ascii=False),
            encoding="utf-8",
        )
        return True
    except subprocess.TimeoutExpired:
        print(f"  ERROR: Node.js timed out for {src_path.name}")
        return False
    except json.JSONDecodeError as e:
        print(f"  ERROR: Invalid JSON output for {src_path.name}: {e}")
        return False


def convert_dfm():
    """Convert dfm_data.js (already valid JSON after prefix removal)."""
    src = PROJECT_ROOT / "dfm_nowcast" / "dfm_data.js"
    if not src.exists():
        print(f"  SKIP: {src} not found")
        return False

    content = src.read_text(encoding="utf-8")
    # Remove BOM
    if content.startswith("\ufeff"):
        content = content[1:]
    # Remove comment lines at the top
    lines = content.split("\n")
    data_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("window.DFM_DATA"):
            data_start = i
            break

    content = "\n".join(lines[data_start:])
    # Strip prefix and semicolon
    content = re.sub(r"^window\.DFM_DATA\s*=\s*", "", content.strip(), count=1)
    if content.endswith(";"):
        content = content[:-1]

    data = json.loads(content.strip())
    out = DATA_OUT / "dfm_data.json"
    out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    n_vars = data.get("meta", {}).get("n_vars", "?")
    print(f"  OK: dfm_data.json ({n_vars} variables, {out.stat().st_size:,} bytes)")
    return True


def convert_pe():
    """Convert pe_data.js via Node.js."""
    src = PROJECT_ROOT / "pe_model" / "pe_data.js"
    out = DATA_OUT / "pe_data.json"
    if convert_with_node(src, "PE_DATA", out):
        data = json.loads(out.read_text(encoding="utf-8"))
        n_sections = len(data.get("sections", []))
        print(f"  OK: pe_data.json ({n_sections} sections, {out.stat().st_size:,} bytes)")
        return True
    return False


def convert_io():
    """Convert io_data.js via Node.js."""
    src = PROJECT_ROOT / "io_model" / "io_data.js"
    out = DATA_OUT / "io_data.json"
    if convert_with_node(src, "IO_DATA", out):
        data = json.loads(out.read_text(encoding="utf-8"))
        n_sectors = len(data.get("codes", []))
        print(f"  OK: io_data.json ({n_sectors} sectors, {out.stat().st_size:,} bytes)")
        return True
    return False


def main():
    print("Converting JS data files to JSON for MCP server...")
    print(f"Source: {PROJECT_ROOT}")
    print(f"Output: {DATA_OUT}")
    print()

    results = {
        "DFM": convert_dfm(),
        "PE": convert_pe(),
        "IO": convert_io(),
    }

    print()
    ok = sum(1 for v in results.values() if v)
    print(f"Done: {ok}/{len(results)} files converted successfully.")
    if not all(results.values()):
        print("Some files were skipped — check paths above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
