"""Reform pipeline tools — fetch, categorize, and update policy tracker data.

Scrapes/fetches Uzbekistan government sources (lex.uz, CBU, WTO) for new
policy reforms, uses Claude to categorize and summarize, then merges into
shared/policy-tracker-data.js.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger("uz-policy-mcp.reforms")

# Government source URLs
SOURCES = {
    "lex_uz": "https://lex.uz/ru/search/nat",
    "cbu": "https://cbu.uz/en/press-tsentr/novosti/",
    "wto": "https://www.wto.org/english/thewto_e/acc_e/a1_uzbekistan_e.htm",
}

# Category and domain mappings
CATEGORIES = ["wto", "tax", "trade", "monetary", "fiscal", "structural"]
DOCUMENT_TYPES = [
    "presidential_decree",
    "cabinet_resolution",
    "ministry_order",
    "law",
    "regulation",
    "strategy",
]
SECTORS = ["agriculture", "industry", "services", "energy", "finance", "digital", "all"]
REGIONS = [
    "national", "tashkent_city", "tashkent", "samarkand", "bukhara", "fergana",
    "andijan", "namangan", "kashkadarya", "surkhandarya", "navoi", "khorezm",
    "jizzakh", "syrdarya", "karakalpakstan",
]


async def fetch_reforms(
    source: str = "all",
    limit: int = 20,
) -> dict:
    """Fetch recent policy reforms from Uzbekistan government sources.

    Checks lex.uz (government gazette), CBU announcements, and WTO working
    party documents for new decrees, resolutions, and policy decisions.

    Args:
        source: Source to query — "lex_uz", "cbu", "wto", or "all".
        limit: Maximum documents to return per source (5 to 50).

    Returns:
        Dict with "documents" list and "meta" info.
    """
    import httpx

    limit = max(5, min(50, limit))
    valid_sources = list(SOURCES.keys())

    if source == "all":
        target_sources = valid_sources
    elif source in valid_sources:
        target_sources = [source]
    else:
        return {"error": f"Invalid source. Must be one of: {valid_sources + ['all']}"}

    documents = []

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        for src in target_sources:
            try:
                url = SOURCES[src]
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("Source %s returned %d", src, resp.status_code)
                    continue

                text = resp.text

                if src == "lex_uz":
                    docs = _parse_lex_uz(text, limit)
                elif src == "cbu":
                    docs = _parse_cbu(text, limit)
                elif src == "wto":
                    docs = _parse_wto(text, limit)
                else:
                    docs = []

                for doc in docs:
                    doc["source"] = src
                    doc["source_url"] = url
                documents.extend(docs)

            except Exception as e:
                logger.warning("Failed to fetch from %s: %s", src, e)
                documents.append({
                    "source": src,
                    "error": str(e),
                    "raw_text": "",
                })

    return {
        "documents": documents[:limit * len(target_sources)],
        "meta": {
            "sources_queried": target_sources,
            "total_found": len(documents),
        },
    }


async def categorize_reform(
    raw_text: str,
    source: str = "lex_uz",
    api_key: str | None = None,
) -> dict:
    """Categorize and summarize a government document using Claude API.

    Args:
        raw_text: Raw text content of the government document.
        source: Origin of the document ("lex_uz", "cbu", "wto").
        api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.

    Returns:
        Dict with structured reform entry ready for policy-tracker-data.js.
    """
    import os

    import httpx

    if not raw_text or len(raw_text.strip()) < 20:
        return {"error": "Document text too short to categorize."}

    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        # Fallback: keyword-based categorization without AI
        return {"reform": _categorize_by_keywords(raw_text, source), "source": source}

    prompt = f"""Categorize this Uzbekistan government document and generate a structured entry.

Document source: {source}
Document text:
{raw_text[:3000]}

Respond with a single JSON object:
{{
  "category": "<one of: wto, tax, trade, monetary, fiscal, structural>",
  "sector": "<one of: agriculture, industry, services, energy, finance, digital, all>",
  "documentType": "<one of: presidential_decree, cabinet_resolution, ministry_order, law, regulation, strategy>",
  "region": "<national or specific oblast code>",
  "status": "<planned, active, or completed>",
  "domain": "<one of: Tax, Trade, Banking, Energy, Digital, Agriculture, SOE>",
  "title_en": "<concise title in English>",
  "title_ru": "<title in Russian>",
  "title_uz": "<title in Uzbek>",
  "description_en": "<2-3 sentence description in English>",
  "description_ru": "<description in Russian>",
  "description_uz": "<description in Uzbek>",
  "linkedModels": ["<model ids: qpm, dfm, pe, io, cge, fpp>"],
  "startDate": "<YYYY-MM-DD estimated start>",
  "endDate": "<YYYY-MM-DD estimated end or null>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code != 200:
                return {"error": f"Claude API returned {resp.status_code}: {resp.text[:200]}"}

            result = resp.json()
            text = result["content"][0]["text"]

            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if not json_match:
                return {"error": "Could not parse Claude response as JSON."}

            entry = json.loads(json_match.group())
    except Exception as e:
        return {"error": f"Categorization failed: {e}"}

    # Validate fields
    entry.setdefault("category", "structural")
    entry.setdefault("status", "active")
    entry.setdefault("documentType", "regulation")
    entry.setdefault("region", "national")
    entry.setdefault("domain", "SOE")
    entry.setdefault("linkedModels", [])

    if entry["category"] not in CATEGORIES:
        entry["category"] = "structural"
    if entry["documentType"] not in DOCUMENT_TYPES:
        entry["documentType"] = "regulation"

    return {"reform": entry, "source": source}


async def update_tracker_file(
    new_reforms: list[dict],
    shared_dir: str,
) -> dict:
    """Merge new categorized reforms into shared/policy-tracker-data.js.

    Deduplicates by title. Recalculates dashboard KPIs.

    Args:
        new_reforms: List of reform entry dicts from categorize_reform.
        shared_dir: Absolute path to the shared/ directory.

    Returns:
        Dict with counts of added/skipped reforms.
    """
    tracker_path = Path(shared_dir) / "policy-tracker-data.js"
    if not tracker_path.exists():
        return {"error": f"File not found: {tracker_path}"}

    content = tracker_path.read_text(encoding="utf-8")

    # Build dedup index from existing titles
    existing_titles: set[str] = set()
    for m in re.finditer(r'en:\s*"([^"]+)"', content):
        existing_titles.add(m.group(1).lower().strip())

    added = []
    skipped = 0
    for reform in new_reforms:
        title_en = (reform.get("title_en") or "").strip()
        if not title_en or title_en.lower() in existing_titles:
            skipped += 1
            continue

        slug = re.sub(r"[^a-z0-9]+", "-", title_en.lower()[:50]).strip("-")
        reform["id"] = slug
        added.append(reform)

    if not added:
        return {"added": 0, "skipped": skipped, "message": "No new reforms to add."}

    # Build JS entries
    new_entries_js = ""
    for r in added:
        models_js = ", ".join(f'"{m}"' for m in r.get("linkedModels", []))
        new_entries_js += f"""    {{
      id: "{_js_esc(r['id'])}",
      title: {{
        en: "{_js_esc(r.get('title_en',''))}",
        ru: "{_js_esc(r.get('title_ru',''))}",
        uz: "{_js_esc(r.get('title_uz',''))}",
      }},
      description: {{
        en: "{_js_esc(r.get('description_en',''))}",
        ru: "{_js_esc(r.get('description_ru',''))}",
        uz: "{_js_esc(r.get('description_uz',''))}",
      }},
      category: "{_js_esc(r.get('category','structural'))}",
      status: "{_js_esc(r.get('status','active'))}",
      domain: "{_js_esc(r.get('domain','SOE'))}",
      sector: "{_js_esc(r.get('sector','all'))}",
      region: "{_js_esc(r.get('region','national'))}",
      documentType: "{_js_esc(r.get('documentType','regulation'))}",
      startDate: "{_js_esc(r.get('startDate',''))}",
      endDate: {f'"{_js_esc(r["endDate"])}"' if r.get("endDate") else "null"},
      lastUpdated: "{_today()}",
      linkedModels: [{models_js}],
      sources: [{{ title: "{_js_esc(r.get('source',''))} document", url: "" }}],
    }},
"""

    # Insert before the closing "]" of the reforms array
    insert_pos = content.rfind("},\n  ],")
    if insert_pos == -1:
        insert_pos = content.rfind("},\n  ]")
    if insert_pos == -1:
        return {"error": "Could not find insertion point in policy-tracker-data.js"}

    insert_after = content.index("\n", insert_pos) + 1
    updated = content[:insert_after] + new_entries_js + content[insert_after:]

    # Update meta date
    updated = re.sub(
        r'lastUpdated:\s*"[^"]*"',
        f'lastUpdated: "{_today()}"',
        updated,
        count=1,
    )

    tracker_path.write_text(updated, encoding="utf-8")

    return {
        "added": len(added),
        "skipped": skipped,
        "reforms_added": [r.get("title_en", "") for r in added],
        "file": str(tracker_path),
    }


def _categorize_by_keywords(raw_text: str, source: str) -> dict:
    """Categorize a reform using keyword matching — no API key needed."""
    text = raw_text.lower()
    today = _today()

    # Category detection
    category_keywords = {
        "wto": ["wto", "вто", "jto", "world trade", "accession", "присоединение"],
        "tax": ["tax", "налог", "soliq", "vat", "ндс", "qqs", "акциз", "excise"],
        "trade": ["trade", "торговл", "savdo", "tariff", "тариф", "customs", "таможен", "bojxona", "export", "import"],
        "monetary": ["monetary", "монетар", "monetar", "interest rate", "ставк", "stavka", "inflation", "инфляц", "inflyatsiya", "central bank", "марказий банк"],
        "fiscal": ["fiscal", "фискал", "fiskal", "budget", "бюджет", "byudjet", "spending", "расход"],
        "structural": ["reform", "реформ", "islohotlar", "privatiz", "приватиз", "digital", "цифров", "raqamli", "energy", "энерг", "energetika"],
    }
    category = "structural"
    best_score = 0
    for cat, keywords in category_keywords.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            category = cat

    # Sector detection
    sector_keywords = {
        "agriculture": ["agriculture", "сельск", "qishloq", "farm", "фермер", "dehqon"],
        "industry": ["industr", "промышлен", "sanoat", "manufactur", "производств"],
        "energy": ["energy", "энерг", "energetika", "oil", "gas", "нефт", "газ"],
        "finance": ["bank", "банк", "finance", "финанс", "moliya", "insurance", "страхов"],
        "digital": ["digital", "цифров", "raqamli", "IT", "technolog", "технолог", "texnologiya"],
        "services": ["service", "услуг", "xizmat", "tourism", "туризм", "sayyohlik"],
    }
    sector = "all"
    best_score = 0
    for sec, keywords in sector_keywords.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            sector = sec

    # Document type from source
    doc_type_keywords = {
        "presidential_decree": ["указ", "президент", "farmon", "decree"],
        "cabinet_resolution": ["постановлен", "кабинет", "qaror", "resolution", "cabinet"],
        "law": ["закон", "qonun", "law"],
        "strategy": ["стратеги", "strategiya", "strategy", "program", "программ", "dastur"],
    }
    doc_type = "regulation"
    for dt, keywords in doc_type_keywords.items():
        if any(kw in text for kw in keywords):
            doc_type = dt
            break

    # Domain mapping from category
    domain_map = {
        "wto": "Trade", "tax": "Tax", "trade": "Trade",
        "monetary": "Banking", "fiscal": "Tax", "structural": "SOE",
    }
    if sector == "energy":
        domain = "Energy"
    elif sector == "agriculture":
        domain = "Agriculture"
    elif sector == "digital":
        domain = "Digital"
    else:
        domain = domain_map.get(category, "SOE")

    # Linked models
    model_links = {
        "wto": ["pe", "cge"], "tax": ["cge", "fpp"], "trade": ["pe", "cge", "io"],
        "monetary": ["qpm", "dfm"], "fiscal": ["fpp", "cge"], "structural": ["io", "cge"],
    }
    linked = model_links.get(category, ["cge"])

    # Use raw text as title (truncated)
    title = raw_text.strip()[:120].replace('"', "'")

    return {
        "category": category,
        "sector": sector,
        "documentType": doc_type,
        "region": "national",
        "status": "active",
        "domain": domain,
        "title_en": title,
        "title_ru": title,
        "title_uz": title,
        "description_en": f"Policy document from {source} — auto-categorized by keyword matching.",
        "description_ru": f"Нормативный документ из {source} — автоматическая категоризация.",
        "description_uz": f"{source} dan normativ hujjat — kalit so'zlar bo'yicha tasniflangan.",
        "linkedModels": linked,
        "startDate": today,
        "endDate": None,
    }



    """Extract document entries from lex.uz search results HTML."""
    docs = []
    # Look for document blocks — lex.uz uses structured HTML
    for m in re.finditer(
        r'<a[^>]*href="(/ru/docs/\d+)"[^>]*>([^<]+)</a>',
        html,
    ):
        if len(docs) >= limit:
            break
        url_path = m.group(1)
        title = m.group(2).strip()
        if title:
            docs.append({
                "title": title,
                "url": f"https://lex.uz{url_path}",
                "raw_text": title,
            })
    return docs


def _parse_cbu(html: str, limit: int) -> list[dict]:
    """Extract news entries from CBU announcements page."""
    docs = []
    for m in re.finditer(
        r'<a[^>]*href="([^"]*)"[^>]*class="[^"]*news[^"]*"[^>]*>([^<]+)</a>',
        html,
        re.IGNORECASE,
    ):
        if len(docs) >= limit:
            break
        docs.append({
            "title": m.group(2).strip(),
            "url": m.group(1),
            "raw_text": m.group(2).strip(),
        })
    # Fallback: grab any article-like links
    if not docs:
        for m in re.finditer(r'<h[23][^>]*>([^<]+)</h[23]>', html):
            if len(docs) >= limit:
                break
            docs.append({
                "title": m.group(1).strip(),
                "url": "",
                "raw_text": m.group(1).strip(),
            })
    return docs


def _parse_wto(html: str, limit: int) -> list[dict]:
    """Extract working party document references from WTO accession page."""
    docs = []
    for m in re.finditer(
        r'<a[^>]*href="([^"]*)"[^>]*>([^<]*(?:WT/ACC|working party)[^<]*)</a>',
        html,
        re.IGNORECASE,
    ):
        if len(docs) >= limit:
            break
        docs.append({
            "title": m.group(2).strip(),
            "url": m.group(1) if m.group(1).startswith("http") else f"https://www.wto.org{m.group(1)}",
            "raw_text": m.group(2).strip(),
        })
    return docs


def _js_esc(s: str) -> str:
    """Escape a string for JS string literals."""
    return (s or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")


def _today() -> str:
    """Return today's date as YYYY-MM-DD."""
    from datetime import date
    return date.today().isoformat()
