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
from mcp_security import AuthorizedFastMCP, MCPConfiguration, ConfigurationError

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    stream=sys.stderr,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("uz-policy-mcp")
# Protocol debug logs can contain complete tool arguments. Never enable them.
for sensitive_logger in ("mcp", "httpx", "httpcore"):
    logging.getLogger(sensitive_logger).setLevel(logging.WARNING)

# Initialize FastMCP server
try:
    configuration = MCPConfiguration.from_env()
except ConfigurationError as error:
    logger.error("MCP configuration rejected: %s", error)
    raise SystemExit(2) from None
mcp = AuthorizedFastMCP(configuration)

# Data directory (model JSON files)
DATA_DIR = Path(__file__).parent / "data"

# Shared frontend data directory (literature, tracker, research JS files)
SHARED_DIR = Path(__file__).parent.parent / "shared"

def _load_model_data(name):
    # No process-lifetime cache: guard and kernel share one per-execution snapshot.
    path = DATA_DIR / f'{name}_data.json'
    if not path.exists():
        logger.warning('%s not found; model route is unavailable', path.name)
        return None
    return json.loads(path.read_text(encoding='utf-8-sig'))


def get_io_data():
    return _load_model_data('io')


def get_pe_data():
    return _load_model_data('pe')


def get_dfm_data():
    return _load_model_data('dfm')


# Register all tools
from tools.registry import register_tools  # noqa: E402

register_tools(mcp, get_io_data, get_pe_data, get_dfm_data, shared_dir=str(SHARED_DIR))

if __name__ == "__main__":
    if configuration.transport == "http":
        logger.info("Starting MCP server (HTTP streamable)")
        mcp.run(transport="streamable-http")
    else:
        logger.info("Starting MCP server (stdio transport)")
        mcp.run(transport="stdio")
