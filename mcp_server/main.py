"""Uzbekistan Economic Policy Engine — MCP Server.

Exposes 6 macroeconomic models as AI-queryable tools via the Model Context Protocol.
Inspired by France's datagouv-mcp (https://github.com/datagouv/datagouv-mcp).
"""

import json
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    stream=sys.stderr,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("uz-policy-mcp")

# Initialize FastMCP server
mcp = FastMCP(
    "uzbekistan-policy-engine",
    description=(
        "Uzbekistan Economic Policy Engine — 6 macroeconomic models "
        "(QPM, DFM, PE, I-O, CGE, FPP) queryable via MCP. "
        "Run policy simulations, GDP nowcasts, trade impact analysis, "
        "and more through natural language."
    ),
)

# Data directory
DATA_DIR = Path(__file__).parent / "data"

# Lazy-loaded data caches
_io_data = None
_pe_data = None
_dfm_data = None


def get_io_data():
    global _io_data
    if _io_data is None:
        path = DATA_DIR / "io_data.json"
        if path.exists():
            with open(path) as f:
                _io_data = json.load(f)
            logger.info("Loaded I-O data: %d sectors", len(_io_data.get("codes", [])))
        else:
            logger.warning("io_data.json not found — I-O tools will be unavailable")
    return _io_data


def get_pe_data():
    global _pe_data
    if _pe_data is None:
        path = DATA_DIR / "pe_data.json"
        if path.exists():
            with open(path) as f:
                _pe_data = json.load(f)
            logger.info("Loaded PE data: %d sections", len(_pe_data.get("sections", [])))
        else:
            logger.warning("pe_data.json not found — PE tools will be unavailable")
    return _pe_data


def get_dfm_data():
    global _dfm_data
    if _dfm_data is None:
        path = DATA_DIR / "dfm_data.json"
        if path.exists():
            with open(path) as f:
                _dfm_data = json.load(f)
            logger.info("Loaded DFM data: %d variables", _dfm_data.get("meta", {}).get("n_vars", 0))
        else:
            logger.warning("dfm_data.json not found — DFM tools will be unavailable")
    return _dfm_data


# Register all tools
from tools.registry import register_tools  # noqa: E402

register_tools(mcp, get_io_data, get_pe_data, get_dfm_data)

if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    if transport == "http":
        host = os.getenv("MCP_HOST", "0.0.0.0")
        port = int(os.getenv("MCP_PORT", "8000"))
        logger.info("Starting MCP server on %s:%d (HTTP streamable)", host, port)
        mcp.run(transport="streamable-http", host=host, port=port)
    else:
        logger.info("Starting MCP server (stdio transport)")
        mcp.run(transport="stdio")
