# FPP Workbook Owner Outreach Checklist

Date: 2026-04-27
Status: planning intake template; owner response pending
Scope: FPP Gate 1 workbook ownership, location, metadata, and sheet/range confirmation

## Purpose

Obtain the owner-confirmed canonical `unified-v1` workbook location and metadata needed for FPP Gate 1 review.

Use the owner response to convert the current candidate freeze in `docs/planning/fpp-unified-v1-workbook-freeze.md` into an accepted freeze later.

This checklist does not authorize artifact generation or code. It does not authorize frontend implementation, backend implementation, workbook extraction, workbook edits, or workbook re-saves.

## Owner Questions

Ask the workbook owner:

- Are you the owner of the `unified-v1` workbook?
- What is the canonical file name and location?
- Are there multiple copies?
- Which copy is authoritative?
- Can the workbook be committed to this repo?
- If not, where should it be stored?
- What are the license/redistribution restrictions?
- Who can approve use in the internal preview?
- Who can approve later pilot/external use?

## Workbook Metadata Intake

Record the following fields for the owner-confirmed `unified-v1` workbook only:

| Field | Owner response |
|---|---|
| File path/location | TO CONFIRM |
| File name | TO CONFIRM |
| Byte size | TO CONFIRM |
| SHA-256 | TO CONFIRM |
| Last modified timestamp | TO CONFIRM |
| Hash command/tool used | TO CONFIRM |
| Workbook locale | TO CONFIRM |
| Last edited by/date if available | TO CONFIRM |
| Hidden/protected sheets | TO CONFIRM |
| External links | TO CONFIRM |
| Volatile formulas | TO CONFIRM |
| Macros/VBA presence | TO CONFIRM |
| Password protection | TO CONFIRM |
| Source variant | `unified-v1` only |

## Sheet/Range Intake

Complete one row for each owner-confirmed sheet/range that may feed FPP Gate 1 review or later extraction planning.

| Sheet name | Named range | A1 range | Header row | Orientation | Time coverage | Sector/output group | Unit/currency | Nominal/real | Methodology tag | Identity participation | Null/sentinel convention | Source/provenance note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM |
| TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM |
| TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM | TO CONFIRM |

## Sign-off Template

| Field | Value |
|---|---|
| Owner name | TO CONFIRM |
| Role | TO CONFIRM |
| Date | TO CONFIRM |
| Approval mechanism | TO CONFIRM |
| Accepted canonical file | TO CONFIRM |
| Accepted restrictions | TO CONFIRM |

Acceptance statement:

> I confirm this is the canonical unified-v1 workbook candidate for FPP Gate 1 review.

## Safety Instructions

- Do not edit or re-save the workbook before hashing.
- If the workbook is opened in Excel, do not save it.
- Hash the workbook before and after transfer.
- If the hash changes, treat the workbook as a new candidate freeze.

## Next Steps After Response

- Update `docs/planning/fpp-unified-v1-workbook-freeze.md`.
- Attach or record hash metadata.
- Keep Gate 1 open until owner sign-off.
- Do not generate code or artifacts yet.
