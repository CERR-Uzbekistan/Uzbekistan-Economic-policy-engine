"""Policy intelligence pipeline — fetch, categorize, and update tracker data.

Scrapes/fetches Uzbekistan government sources (lex.uz, CBU, WTO) AND
international organization assessments (IMF, World Bank, ADB, EBRD, UNDP)
for new policy documents and research reports, uses Claude to categorize
and summarize, then merges into shared/policy-tracker-data.js.

Schema v0.2.0: unified ``entries`` array with ``type`` field distinguishing
government actions (binding) from international assessments (advisory).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger("uz-policy-mcp.reforms")

# Government source URLs
GOV_SOURCES = {
    "lex_uz": "https://lex.uz/ru/search/nat",
    "cbu": "https://cbu.uz/en/press-tsentr/novosti/",
    "wto": "https://www.wto.org/english/thewto_e/acc_e/a1_uzbekistan_e.htm",
}

# International organization source URLs (landing pages for Uzbekistan reports)
INTL_SOURCES = {
    "imf": "https://www.imf.org/en/countries/uzb",
    "worldbank": "https://www.worldbank.org/en/country/uzbekistan",
    "adb": "https://www.adb.org/countries/uzbekistan",
    "ebrd": "https://www.ebrd.com/uzbekistan.html",
    "undp": "https://www.undp.org/uzbekistan",
}

# ── v0.2 schema vocabularies ──
TAGS = [
    "wto", "tax", "trade", "monetary", "fiscal", "digital", "energy",
    "agriculture", "banking", "structural", "soe", "environment",
    "labor", "macro", "poverty", "governance",
]
DOC_TYPES = [
    "presidential_decree",
    "presidential_resolution",
    "cabinet_resolution",
    "law",
    "ministry_order",
]
ISSUERS = ["president", "cabinet", "parliament", "ministry", "cbu"]
ORGANIZATIONS = ["imf", "worldbank", "adb", "ebrd", "undp"]
REPORT_TYPES = ["article_iv", "country_report", "outlook", "sector_assessment", "evaluation", "brief"]
STATUSES = ["planned", "active", "completed"]
REGIONS = [
    "national", "tashkent_city", "tashkent_region", "samarkand", "bukhara", "fergana",
    "andijan", "namangan", "kashkadarya", "surkhandarya", "navoi", "khorezm",
    "jizzakh", "sirdarya", "karakalpakstan",
]


async def fetch_reforms(
    source: str = "all",
    limit: int = 20,
) -> dict:
    """Fetch recent policy documents from all configured sources.

    Checks government sources (lex.uz, CBU, WTO) and international organizations
    (IMF, WB, ADB, EBRD, UNDP). Returns raw document metadata for downstream
    categorization.

    Args:
        source: Source slug ("lex_uz", "cbu", "wto", "imf", "worldbank",
            "adb", "ebrd", "undp") or "all".
        limit: Maximum documents per source (5 to 50).
    """
    import httpx

    limit = max(5, min(50, limit))
    all_sources = {**GOV_SOURCES, **INTL_SOURCES}

    if source == "all":
        target_sources = list(all_sources.keys())
    elif source in all_sources:
        target_sources = [source]
    else:
        return {"error": f"Invalid source. Must be one of: {list(all_sources.keys()) + ['all']}"}

    documents: list[dict] = []

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        for src in target_sources:
            try:
                url = all_sources[src]
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("Source %s returned %d", src, resp.status_code)
                    continue

                text = resp.text

                if src == "lex_uz":
                    docs = _parse_lex_uz(text, limit)
                    entry_type = "government"
                elif src == "cbu":
                    docs = _parse_cbu(text, limit)
                    entry_type = "government"
                elif src == "wto":
                    docs = _parse_wto(text, limit)
                    entry_type = "government"
                else:
                    # International organization: generic link extraction
                    docs = _parse_intl(text, limit)
                    entry_type = "international"

                for doc in docs:
                    doc["source"] = src
                    doc["source_url"] = url
                    doc["type"] = entry_type
                documents.extend(docs)

            except Exception as e:  # noqa: BLE001 - isolate one external source failure
                logger.warning("Failed to fetch from %s: %s", src, e)
                documents.append({"source": src, "error": str(e), "raw_text": ""})

    return {
        "documents": documents[:limit * len(target_sources)],
        "meta": {"sources_queried": target_sources, "total_found": len(documents)},
    }


async def categorize_reform(
    raw_text: str,
    source: str = "lex_uz",
    api_key: str | None = None,
) -> dict:
    """Categorize and summarize a policy document using Claude API.

    Emits schema v0.2 entry fields: unified for both government (lex.uz-style)
    and international (IMF/WB/etc.) documents.

    Args:
        raw_text: Raw text content of the document.
        source: Origin slug (gov: "lex_uz"/"cbu"/"wto"; intl: "imf"/"worldbank"/...).
        api_key: Anthropic API key. If None, falls back to keyword categorization.
    """
    import os

    import httpx

    if not raw_text or len(raw_text.strip()) < 20:
        return {"error": "Document text too short to categorize."}

    entry_type = "international" if source in ORGANIZATIONS else "government"

    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"reform": _categorize_by_keywords(raw_text, source, entry_type), "source": source}

    if entry_type == "government":
        schema_hint = f"""{{
  "type": "government",
  "title_en": "<concise title in English>",
  "title_ru": "<title in Russian>",
  "title_uz": "<title in Uzbek>",
  "summary_en": "<2-3 sentence summary in English>",
  "summary_ru": "<summary in Russian>",
  "summary_uz": "<summary in Uzbek>",
  "date": "<YYYY-MM-DD publication/signing date>",
  "endDate": "<YYYY-MM-DD policy horizon end, or null>",
  "tags": ["<2-5 tags from: {', '.join(TAGS)}>"],
  "docNumber": "<official doc number e.g. ПҚ-136 or null>",
  "docType": "<one of: {', '.join(DOC_TYPES)}>",
  "issuer": "<one of: {', '.join(ISSUERS)}>",
  "scope": "<'national' or region slug>",
  "status": "<one of: {', '.join(STATUSES)}>",
  "parentDoc": "<id of parent doc if this operationalizes one, else null>",
  "linkedModels": ["<model ids: qpm, dfm, pe, io, cge, fpp>"],
  "sourceUrl": "<canonical URL>"
}}"""
    else:
        schema_hint = f"""{{
  "type": "international",
  "title_en": "<title in English>",
  "title_ru": "<title in Russian>",
  "title_uz": "<title in Uzbek>",
  "summary_en": "<2-4 sentence summary of key findings/data in English>",
  "summary_ru": "<summary in Russian>",
  "summary_uz": "<summary in Uzbek>",
  "date": "<YYYY-MM-DD publication date>",
  "tags": ["<2-5 tags from: {', '.join(TAGS)}>"],
  "organization": "<one of: {', '.join(ORGANIZATIONS)}>",
  "reportType": "<one of: {', '.join(REPORT_TYPES)}>",
  "linkedModels": ["<model ids: qpm, dfm, pe, io, cge, fpp>"],
  "sourceUrl": "<canonical URL>"
}}"""

    prompt = f"""Categorize this Uzbekistan {entry_type} policy document into schema v0.2.

Source: {source}
Document text:
{raw_text[:3500]}

Respond with a single JSON object following this exact schema:
{schema_hint}
"""

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
    except Exception as e:  # noqa: BLE001 - return a stable pipeline error contract
        return {"error": f"Categorization failed: {e}"}

    entry = _validate_entry(entry, entry_type, source)
    return {"reform": entry, "source": source}


async def update_tracker_file(
    new_reforms: list[dict],
    shared_dir: str,
) -> dict:
    """Merge new categorized entries into shared/policy-tracker-data.js.

    Deduplicates government entries by docNumber (falling back to title),
    and international entries by sourceUrl (falling back to title).

    Args:
        new_reforms: List of entry dicts from categorize_reform.
        shared_dir: Absolute path to the shared/ directory.
    """
    tracker_path = Path(shared_dir) / "policy-tracker-data.js"
    if not tracker_path.exists():
        return {"error": f"File not found: {tracker_path}"}

    content = tracker_path.read_text(encoding="utf-8")

    # Build dedup index from existing titles, docNumbers, sourceUrls
    existing_titles = {m.group(1).lower().strip() for m in re.finditer(r'en:\s*"([^"]+)"', content)}
    existing_docs = {m.group(1) for m in re.finditer(r'docNumber:\s*"([^"]+)"', content)}
    existing_urls = {m.group(1) for m in re.finditer(r'sourceUrl:\s*"([^"]+)"', content)}

    added: list[dict] = []
    skipped = 0
    for reform in new_reforms:
        title_en = (reform.get("title_en") or "").strip()
        doc_num = (reform.get("docNumber") or "").strip()
        src_url = (reform.get("sourceUrl") or "").strip()

        # Dedup
        if doc_num and doc_num in existing_docs:
            skipped += 1
            continue
        if src_url and src_url in existing_urls:
            skipped += 1
            continue
        if title_en and title_en.lower() in existing_titles:
            skipped += 1
            continue
        if not title_en:
            skipped += 1
            continue

        slug = re.sub(r"[^a-z0-9]+", "-", title_en.lower()[:50]).strip("-")
        reform["id"] = slug
        added.append(reform)

    if not added:
        return {"added": 0, "skipped": skipped, "message": "No new entries to add."}

    new_entries_js = "".join(_format_entry_js(r) for r in added)

    # Insert before the closing "]" of the entries array
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
        "entries_added": [r.get("title_en", "") for r in added],
        "file": str(tracker_path),
    }


# ──────────────────────────────────────────────────────────────
# Internals
# ──────────────────────────────────────────────────────────────

def _validate_entry(entry: dict, entry_type: str, source: str) -> dict:
    """Normalize + validate entry fields against schema v0.2."""
    entry["type"] = entry_type

    # Tags: must be a subset of TAGS
    tags = entry.get("tags") or []
    entry["tags"] = [t for t in tags if t in TAGS] or ["structural"]

    entry.setdefault("linkedModels", [])
    entry.setdefault("date", _today())

    if entry_type == "government":
        if entry.get("docType") not in DOC_TYPES:
            entry["docType"] = "cabinet_resolution"
        if entry.get("issuer") not in ISSUERS:
            entry["issuer"] = "cabinet"
        if entry.get("status") not in STATUSES:
            entry["status"] = "active"
        entry.setdefault("scope", "national")
        entry.setdefault("docNumber", None)
        entry.setdefault("parentDoc", None)
        entry.setdefault("endDate", None)
    else:  # international
        if entry.get("organization") not in ORGANIZATIONS:
            entry["organization"] = source if source in ORGANIZATIONS else "imf"
        if entry.get("reportType") not in REPORT_TYPES:
            entry["reportType"] = "country_report"

    return entry


def _categorize_by_keywords(raw_text: str, source: str, entry_type: str) -> dict:
    """Keyword-based fallback when no API key is available."""
    text = raw_text.lower()
    today = _today()

    tag_keywords = {
        "wto":         ["wto", "вто", "jto", "world trade", "accession"],
        "tax":         ["tax", "налог", "soliq", "vat", "ндс", "qqs", "excise", "акциз"],
        "trade":       ["trade", "торговл", "savdo", "tariff", "customs", "bojxona", "export", "import"],
        "monetary":    ["monetary", "монетар", "monetar", "interest rate", "ставк", "inflation", "инфляц", "central bank"],
        "fiscal":      ["fiscal", "фискал", "fiskal", "budget", "бюджет", "byudjet", "spending"],
        "digital":     ["digital", "цифров", "raqamli", "IT", "e-commerce", "marketplace"],
        "energy":      ["energy", "энерг", "energetika", "oil", "gas", "нефт"],
        "agriculture": ["agriculture", "сельск", "qishloq", "farm", "greenhouse", "теплиц"],
        "banking":     ["bank", "банк", "credit", "кредит"],
        "structural":  ["reform", "реформ", "islohotlar", "privatiz"],
        "soe":         ["soe", "state-owned", "госпредприятие", "davlat korxonasi"],
        "environment": ["environment", "эколог", "ekolog", "pollut", "emission"],
        "labor":       ["labor", "труд", "mehnat", "employment", "занятост"],
        "macro":       ["gdp", "ввп", "yaim", "growth", "рост"],
        "poverty":     ["poverty", "бедност", "kambag'al"],
        "governance":  ["governance", "управлен", "boshqaruv", "judicial", "судеб"],
    }
    scores = {tag: sum(1 for kw in kws if kw in text) for tag, kws in tag_keywords.items()}
    top_tags = sorted(scores.items(), key=lambda x: -x[1])
    tags = [t for t, s in top_tags if s > 0][:4] or ["structural"]

    # Linked models
    model_links = {
        "wto": ["pe", "cge"], "tax": ["cge", "fpp"], "trade": ["pe", "cge", "io"],
        "monetary": ["qpm", "dfm"], "fiscal": ["fpp", "cge"], "digital": ["cge"],
        "energy": ["cge", "io"], "agriculture": ["io", "cge"], "banking": ["fpp", "qpm"],
        "macro": ["qpm", "dfm", "fpp"], "poverty": ["fpp", "cge"],
    }
    linked = sorted({m for tag in tags for m in model_links.get(tag, [])}) or ["cge"]

    title = raw_text.strip()[:120].replace('"', "'")

    base = {
        "type": entry_type,
        "title_en": title,
        "title_ru": title,
        "title_uz": title,
        "summary_en": f"Document from {source} — auto-categorized by keyword matching.",
        "summary_ru": f"Документ из {source} — автоматическая категоризация.",
        "summary_uz": f"{source} manbasidan hujjat — kalit so'zlar bo'yicha tasniflangan.",
        "date": today,
        "tags": tags,
        "linkedModels": linked,
        "sourceUrl": "",
    }

    if entry_type == "government":
        # Detect document type from issuer keywords
        doc_type = "cabinet_resolution"
        issuer = "cabinet"
        if any(kw in text for kw in ["указ президента", "prezident farmoni", "presidential decree", "пф-", "пф "]):
            doc_type, issuer = "presidential_decree", "president"
        elif any(kw in text for kw in ["постановление президента", "prezident qarori", "пқ-", "pq-"]):
            doc_type, issuer = "presidential_resolution", "president"
        elif any(kw in text for kw in ["закон", "qonun", "law", "орқ-", "ўрқ-"]):
            doc_type, issuer = "law", "parliament"

        base.update({
            "docNumber": None,
            "docType": doc_type,
            "issuer": issuer,
            "scope": "national",
            "status": "active",
            "endDate": None,
            "parentDoc": None,
        })
    else:
        base.update({
            "organization": source if source in ORGANIZATIONS else "imf",
            "reportType": "country_report",
        })

    return base


def _format_entry_js(r: dict) -> str:
    """Render a validated entry dict as a JS object literal for injection."""
    entry_type = r.get("type", "government")
    models_js = ", ".join(f'"{m}"' for m in r.get("linkedModels", []))
    tags_js = ", ".join(f'"{t}"' for t in r.get("tags", []))

    common = f"""    {{
      id: "{_js_esc(r['id'])}",
      type: "{entry_type}",
      title: {{
        en: "{_js_esc(r.get('title_en',''))}",
        ru: "{_js_esc(r.get('title_ru',''))}",
        uz: "{_js_esc(r.get('title_uz',''))}",
      }},
      summary: {{
        en: "{_js_esc(r.get('summary_en',''))}",
        ru: "{_js_esc(r.get('summary_ru',''))}",
        uz: "{_js_esc(r.get('summary_uz',''))}",
      }},
      date: "{_js_esc(r.get('date',''))}",
      tags: [{tags_js}],
      linkedModels: [{models_js}],
      sourceUrl: "{_js_esc(r.get('sourceUrl',''))}","""

    if entry_type == "government":
        end_date = r.get("endDate")
        parent = r.get("parentDoc")
        doc_num = r.get("docNumber")
        type_specific = f"""
      docNumber: {f'"{_js_esc(doc_num)}"' if doc_num else "null"},
      docType: "{_js_esc(r.get('docType','cabinet_resolution'))}",
      issuer: "{_js_esc(r.get('issuer','cabinet'))}",
      scope: "{_js_esc(r.get('scope','national'))}",
      status: "{_js_esc(r.get('status','active'))}",
      endDate: {f'"{_js_esc(end_date)}"' if end_date else "null"},
      parentDoc: {f'"{_js_esc(parent)}"' if parent else "null"},
    }},
"""
    else:
        type_specific = f"""
      organization: "{_js_esc(r.get('organization','imf'))}",
      reportType: "{_js_esc(r.get('reportType','country_report'))}",
    }},
"""
    return common + type_specific


def _parse_lex_uz(html: str, limit: int) -> list[dict]:
    """Extract document entries from lex.uz search results HTML."""
    docs = []
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


def _parse_intl(html: str, limit: int) -> list[dict]:
    """Generic link/headline extraction for international organization pages."""
    docs = []
    seen = set()
    for m in re.finditer(
        r'<a[^>]*href="([^"]+)"[^>]*>\s*([A-Z][^<]{15,150})\s*</a>',
        html,
    ):
        if len(docs) >= limit:
            break
        url = m.group(1)
        title = m.group(2).strip()
        key = title.lower()[:80]
        if key in seen:
            continue
        seen.add(key)
        docs.append({"title": title, "url": url, "raw_text": title})
    return docs


def _js_esc(s) -> str:
    """Escape a value for JS string literals."""
    if s is None:
        return ""
    return str(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")


def _today() -> str:
    """Return today's date as YYYY-MM-DD."""
    return datetime.now(UTC).date().isoformat()
