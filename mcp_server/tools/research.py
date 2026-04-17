"""Research article tool — save policy briefs and AI-generated analyses.

Writes new entries to shared/research-data.js, used both by the
"Publish as Brief" button in the AI Advisor panel and by direct MCP calls.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

logger = logging.getLogger("uz-policy-mcp.research")


async def save_research_article(
    title_en: str,
    title_ru: str = "",
    title_uz: str = "",
    author: str = "CERR Research Team",
    model: str = "",
    topics: list[str] | None = None,
    abstract_en: str = "",
    abstract_ru: str = "",
    abstract_uz: str = "",
    body_en: str = "",
    body_ru: str = "",
    body_uz: str = "",
    shared_dir: str = "",
) -> dict:
    """Save a research article or policy brief to shared/research-data.js.

    Args:
        title_en: Article title in English (required).
        title_ru: Article title in Russian.
        title_uz: Article title in Uzbek.
        author: Author name or team.
        model: Linked model ID (qpm, dfm, cge, io, pe, fpp) or empty.
        topics: Topic tags from: trade, monetary, fiscal, growth, inflation, structural.
        abstract_en: Short abstract in English.
        abstract_ru: Short abstract in Russian.
        abstract_uz: Short abstract in Uzbek.
        body_en: Full article body in English.
        body_ru: Full article body in Russian.
        body_uz: Full article body in Uzbek.
        shared_dir: Absolute path to the shared/ directory.

    Returns:
        Dict with the saved entry ID and file path.
    """
    if not title_en or not title_en.strip():
        return {"error": "title_en is required."}

    if not shared_dir:
        return {"error": "shared_dir path is required."}

    research_path = Path(shared_dir) / "research-data.js"
    if not research_path.exists():
        return {"error": f"File not found: {research_path}"}

    content = research_path.read_text(encoding="utf-8")

    # Check for duplicate titles
    if title_en.lower().strip() in content.lower():
        return {"error": f"An article with a similar title already exists: {title_en}"}

    # Generate ID
    slug = re.sub(r"[^a-z0-9]+", "-", title_en.lower()[:50]).strip("-")
    article_id = f"brief-{slug}-{_today().replace('-', '')[:6]}"

    topics = topics or []
    valid_topics = ["trade", "monetary", "fiscal", "growth", "inflation", "structural"]
    topics = [t for t in topics if t in valid_topics]
    if not topics:
        topics = ["structural"]

    topics_js = ", ".join(f'"{t}"' for t in topics)

    entry_js = f"""    {{
      id: "{_js_esc(article_id)}",
      title: {{
        en: "{_js_esc(title_en)}",
        ru: "{_js_esc(title_ru or title_en)}",
        uz: "{_js_esc(title_uz or title_en)}",
      }},
      author: "{_js_esc(author)}",
      date: "{_today()}",
      model: "{_js_esc(model)}",
      topics: [{topics_js}],
      abstract: {{
        en: "{_js_esc(abstract_en)}",
        ru: "{_js_esc(abstract_ru or abstract_en)}",
        uz: "{_js_esc(abstract_uz or abstract_en)}",
      }},
      body: {{
        en: "{_js_esc(body_en)}",
        ru: "{_js_esc(body_ru or body_en)}",
        uz: "{_js_esc(body_uz or body_en)}",
      }},
    }},
"""

    # Insert before closing "]" of entries array
    insert_pos = content.rfind("},\n  ],")
    if insert_pos == -1:
        insert_pos = content.rfind("},\n  ]")
    if insert_pos == -1:
        return {"error": "Could not find insertion point in research-data.js"}

    insert_after = content.index("\n", insert_pos) + 1
    updated = content[:insert_after] + entry_js + content[insert_after:]

    # Update meta date
    updated = re.sub(
        r'lastUpdated:\s*"[^"]*"',
        f'lastUpdated: "{_today()}"',
        updated,
        count=1,
    )

    research_path.write_text(updated, encoding="utf-8")

    return {
        "id": article_id,
        "title": title_en,
        "file": str(research_path),
        "message": "Research article saved successfully.",
    }


def _js_esc(s: str) -> str:
    """Escape a string for JS string literals."""
    return (s or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")


def _today() -> str:
    """Return today's date as YYYY-MM-DD."""
    from datetime import date
    return date.today().isoformat()
