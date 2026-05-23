#!/usr/bin/env python3
"""Build the I-O bridge source from the local Statistics Agency workbooks.

The committed public bridge uses the resource-denominator convention:
technical coefficients are Z / total_resources. The workbook coefficient
sheet is still audited as source context, but this exporter derives A from the
transaction table so the app keeps the same convention as the current bridge.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import zipfile
from datetime import date
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


N_SECTORS = 136
SECTOR_FIRST_ROW = 8
SECTOR_CODE_COL = 2
SECTOR_NAME_COL = 3
SECTOR_MATRIX_FIRST_COL = 4

COL_INTERMEDIATE_DEMAND = 140
COL_HOUSEHOLD = 141
COL_GOV_INDIVIDUAL = 142
COL_GOV_COLLECTIVE = 143
COL_NPISH = 144
COL_GFCF = 145
COL_INVENTORIES = 146
COL_EXPORTS = 147
COL_FINAL_DEMAND = 148
COL_OUTPUT = 149

ROW_COE = 148
ROW_GOS = 152
ROW_GVA = 153

XLSX_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RELS_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PACKAGE_RELS_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def normalize_text(value: Any) -> str:
    return str(value).strip()


def normalize_code_for_compare(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value)).strip()


def to_number(value: Any, field: str) -> float:
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str) and value.strip():
        number = float(value.replace(",", "."))
    else:
        raise ValueError(f"Missing numeric value for {field}.")
    if not math.isfinite(number):
        raise ValueError(f"Non-finite numeric value for {field}: {value!r}")
    return number


def round_money(value: float) -> float:
    return round(value + 0.0, 2)


def round_ratio(value: float, digits: int = 8) -> float:
    return round(value + 0.0, digits)


def col_ref_to_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref)
    if not letters:
        raise ValueError(f"Invalid cell reference: {ref}")
    value = 0
    for letter in letters.group(0):
        value = value * 26 + ord(letter) - ord("A") + 1
    return value


class XlsxBook:
    def __init__(self, path: Path) -> None:
        self.path = path
        if not path.exists():
            raise FileNotFoundError(path)
        self.archive = zipfile.ZipFile(path)
        self.shared_strings = self._read_shared_strings()
        self.sheet_paths = self._read_sheet_paths()

    def close(self) -> None:
        self.archive.close()

    def _read_shared_strings(self) -> list[str]:
        if "xl/sharedStrings.xml" not in self.archive.namelist():
            return []
        root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
        strings: list[str] = []
        for item in root.findall(f"{XLSX_NS}si"):
            texts = [node.text or "" for node in item.findall(f".//{XLSX_NS}t")]
            strings.append("".join(texts))
        return strings

    def _read_sheet_paths(self) -> dict[str, str]:
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        rels = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        rel_by_id = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels.findall(f"{PACKAGE_RELS_NS}Relationship")
        }

        paths: dict[str, str] = {}
        for sheet in workbook.findall(f".//{XLSX_NS}sheet"):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib[f"{RELS_NS}id"]
            target = rel_by_id[rel_id]
            if target.startswith("/"):
                path = target.lstrip("/")
            else:
                path = f"xl/{target}"
            paths[name] = path
        return paths

    def sheet(self, name: str) -> dict[tuple[int, int], Any]:
        if name not in self.sheet_paths:
            raise KeyError(f"Sheet {name!r} not found in {self.path.name}.")
        root = ET.fromstring(self.archive.read(self.sheet_paths[name]))
        cells: dict[tuple[int, int], Any] = {}
        for row in root.findall(f".//{XLSX_NS}row"):
            row_index = int(row.attrib["r"])
            for cell in row.findall(f"{XLSX_NS}c"):
                ref = cell.attrib["r"]
                col_index = col_ref_to_index(ref)
                value = self._cell_value(cell)
                if value is not None:
                    cells[(row_index, col_index)] = value
        return cells

    def _cell_value(self, cell: ET.Element) -> Any:
        cell_type = cell.attrib.get("t")
        if cell_type == "inlineStr":
            text = cell.find(f".//{XLSX_NS}t")
            return text.text if text is not None else ""

        value = cell.find(f"{XLSX_NS}v")
        if value is None:
            return None
        raw = value.text or ""
        if cell_type == "s":
            return self.shared_strings[int(raw)]
        if cell_type == "b":
            return raw == "1"
        if cell_type in {"str", "e"}:
            return raw
        try:
            number = float(raw)
        except ValueError:
            return raw
        return int(number) if number.is_integer() else number


def matrix_inverse(matrix: list[list[float]]) -> list[list[float]]:
    n = len(matrix)
    augmented = [
        [float(matrix[row][col]) for col in range(n)]
        + [1.0 if row == col else 0.0 for col in range(n)]
        for row in range(n)
    ]

    for col in range(n):
        pivot = max(range(col, n), key=lambda row: abs(augmented[row][col]))
        if abs(augmented[pivot][col]) < 1e-12:
            raise ValueError(f"Singular matrix at column {col}.")
        if pivot != col:
            augmented[col], augmented[pivot] = augmented[pivot], augmented[col]

        pivot_value = augmented[col][col]
        augmented[col] = [value / pivot_value for value in augmented[col]]

        for row in range(n):
            if row == col:
                continue
            factor = augmented[row][col]
            if factor == 0:
                continue
            augmented[row] = [
                augmented[row][idx] - factor * augmented[col][idx]
                for idx in range(2 * n)
            ]

    return [row[n:] for row in augmented]


def build_from_workbooks(io_workbook: Path, employment_workbook: Path, generated: str) -> tuple[dict[str, Any], dict[str, Any]]:
    io_book = XlsxBook(io_workbook)
    emp_book = XlsxBook(employment_workbook)
    try:
        total_sheet = io_book.sheet("ТЗВ всего")
        employment_sheet = emp_book.sheet("Employment")
    finally:
        io_book.close()
        emp_book.close()

    sectors: list[dict[str, Any]] = []
    z_matrix_raw: list[list[float]] = []
    z_matrix: list[list[float]] = []
    x: list[float] = []
    x_total_raw: list[float] = []
    x_total: list[float] = []
    y: list[float] = []
    imports: list[float] = []

    for index in range(N_SECTORS):
        row = SECTOR_FIRST_ROW + index
        code = normalize_text(total_sheet[(row, SECTOR_CODE_COL)])
        name = normalize_text(total_sheet[(row, SECTOR_NAME_COL)])
        z_row_raw = [
            to_number(total_sheet.get((row, SECTOR_MATRIX_FIRST_COL + col), 0), f"Z[{index}][{col}]")
            for col in range(N_SECTORS)
        ]
        z_row = [round_money(value) for value in z_row_raw]
        intermediate_demand = to_number(total_sheet[(row, COL_INTERMEDIATE_DEMAND)], f"intermediate[{index}]")
        final_demand_total = to_number(total_sheet[(row, COL_FINAL_DEMAND)], f"final_demand[{index}].total")
        output = to_number(total_sheet[(row, COL_OUTPUT)], f"output[{index}]")
        total_resources = intermediate_demand + final_demand_total

        household = to_number(total_sheet.get((row, COL_HOUSEHOLD), 0), f"household[{index}]")
        government = to_number(total_sheet.get((row, COL_GOV_INDIVIDUAL), 0), f"gov_individual[{index}]") + to_number(
            total_sheet.get((row, COL_GOV_COLLECTIVE), 0), f"gov_collective[{index}]"
        )
        npish = to_number(total_sheet.get((row, COL_NPISH), 0), f"npish[{index}]")
        gfcf = to_number(total_sheet.get((row, COL_GFCF), 0), f"gfcf[{index}]")
        inventories = to_number(total_sheet.get((row, COL_INVENTORIES), 0), f"inventories[{index}]")
        exports = to_number(total_sheet.get((row, COL_EXPORTS), 0), f"exports[{index}]")

        z_matrix_raw.append(z_row_raw)
        z_matrix.append(z_row)
        x.append(round_money(output))
        x_total_raw.append(total_resources)
        x_total.append(round_money(total_resources))
        y.append(round_money(final_demand_total))
        imports.append(round_money(total_resources - output))
        sectors.append(
            {
                "id": index,
                "code": code,
                "name": name,
                "output": round_money(output),
                "total_resources": round_money(total_resources),
                "imports": round_money(total_resources - output),
                "gva": round_money(to_number(total_sheet[(ROW_GVA, SECTOR_MATRIX_FIRST_COL + index)], f"gva[{index}]")),
                "coe": round_money(to_number(total_sheet[(ROW_COE, SECTOR_MATRIX_FIRST_COL + index)], f"coe[{index}]")),
                "gos": round_money(to_number(total_sheet[(ROW_GOS, SECTOR_MATRIX_FIRST_COL + index)], f"gos[{index}]")),
                "output_multiplier": 0.0,
                "va_multiplier": 0.0,
                "final_demand": {
                    "household": round_money(household),
                    "government": round_money(government),
                    "npish": round_money(npish),
                    "gfcf": round_money(gfcf),
                    "inventories": round_money(inventories),
                    "exports": round_money(exports),
                    "total": round_money(final_demand_total),
                },
            }
        )

    a_matrix_raw = [
        [
            z_matrix_raw[row][col] / x_total_raw[col] if x_total_raw[col] else 0.0
            for col in range(N_SECTORS)
        ]
        for row in range(N_SECTORS)
    ]
    a_matrix = [[round_ratio(value) for value in row] for row in a_matrix_raw]
    i_minus_a = [
        [(1.0 if row == col else 0.0) - a_matrix_raw[row][col] for col in range(N_SECTORS)]
        for row in range(N_SECTORS)
    ]
    l_matrix_raw = matrix_inverse(i_minus_a)
    l_matrix = [[round_ratio(value) for value in row] for row in l_matrix_raw]

    for col in range(N_SECTORS):
        sectors[col]["output_multiplier"] = round_ratio(sum(l_matrix[row][col] for row in range(N_SECTORS)), 6)
        sectors[col]["va_multiplier"] = round_ratio(
            sum(
                (sectors[row]["gva"] / sectors[row]["total_resources"] if sectors[row]["total_resources"] else 0.0)
                * l_matrix[row][col]
                for row in range(N_SECTORS)
            ),
            6,
        )

    employment_rows: list[dict[str, Any]] = []
    employment_by_code: dict[str, dict[str, Any]] = {}
    for row in range(1, 500):
        code = employment_sheet.get((row, 1))
        if code is None:
            continue
        norm = normalize_code_for_compare(code)
        if not norm:
            continue
        if (row, 2) not in employment_sheet or (row, 3) not in employment_sheet or (row, 4) not in employment_sheet:
            continue
        entry = {
            "code": normalize_text(code),
            "employment_formal": round(to_number(employment_sheet[(row, 2)], f"employment_formal[{norm}]")),
            "employment_informal": round(to_number(employment_sheet[(row, 3)], f"employment_informal[{norm}]")),
            "employment_total": round(to_number(employment_sheet[(row, 4)], f"employment_total[{norm}]")),
        }
        employment_by_code[norm] = entry

    for sector in sectors:
        norm = normalize_code_for_compare(sector["code"])
        if norm not in employment_by_code:
            raise ValueError(f"Employment workbook missing sector {sector['code']!r}.")
        employment_rows.append({"id": sector["id"], **employment_by_code[norm]})

    source_payload = {
        "metadata": {
            "title": "Таблица затраты-выпуск Республики Узбекистан, 2022",
            "title_en": "Uzbekistan Input-Output Table 2022",
            "year": 2022,
            "n_sectors": N_SECTORS,
            "units": "thousand UZS",
            "source": "Statistics Agency under the President of Uzbekistan",
            "framework": "Leontief — symmetric IO table at basic prices",
            "note_A": "A matrix computed as Z / total_resources (domestic output + imports)",
            "generated": generated,
            "source_workbooks": [
                {
                    "file_name": io_workbook.name,
                    "sheets": ["ТЗВ всего", "К-ты прямых затрат А", "к-ты полных затрат (Е-А)-1"],
                },
                {"file_name": employment_workbook.name, "sheets": ["Employment"]},
            ],
        },
        "sectors": sectors,
        "Z": z_matrix,
        "A": a_matrix,
        "L": l_matrix,
        "X": x,
        "X_total": x_total,
        "Y": y,
        "imports": imports,
    }
    employment_payload = {
        "metadata": {
            "source_workbook": employment_workbook.name,
            "source_sheet": "Employment",
            "n_sectors": N_SECTORS,
            "units": "persons",
            "generated": generated,
        },
        "sectors": employment_rows,
    }
    return source_payload, employment_payload


def compare_payloads(left: Any, right: Any, path: str = "$", issues: list[str] | None = None) -> list[str]:
    if issues is None:
        issues = []
    if isinstance(left, dict) and isinstance(right, dict):
        for key in sorted(set(left) | set(right)):
            if key not in left or key not in right:
                issues.append(f"{path}.{key}: missing on one side")
            else:
                compare_payloads(left[key], right[key], f"{path}.{key}", issues)
        return issues
    if isinstance(left, list) and isinstance(right, list):
        if len(left) != len(right):
            issues.append(f"{path}: length {len(left)} != {len(right)}")
            return issues
        for index, (left_item, right_item) in enumerate(zip(left, right)):
            compare_payloads(left_item, right_item, f"{path}[{index}]", issues)
        return issues
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        if abs(float(left) - float(right)) > 1e-5:
            issues.append(f"{path}: {left} != {right}")
        return issues
    if left != right:
        issues.append(f"{path}: {left!r} != {right!r}")
    return issues


def write_json(path: Path, payload: dict[str, Any], *, pretty: bool = True) -> None:
    if pretty:
        content = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        content = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(content + "\n", encoding="utf-8")


def main() -> int:
    root = repo_root()
    parser = argparse.ArgumentParser(description="Export the I-O source JSON from local Excel workbooks.")
    parser.add_argument(
        "--io-workbook",
        type=Path,
        default=root / "model sources" / "Input-Output model" / "ТЗВ 2022 136х136.xlsx",
    )
    parser.add_argument(
        "--employment-workbook",
        type=Path,
        default=root / "model sources" / "Input-Output model" / "Employment.xlsx",
    )
    parser.add_argument("--source-output", type=Path, default=root / "io_model" / "io_data.json")
    parser.add_argument("--employment-output", type=Path, default=root / "io_model" / "io_employment.json")
    parser.add_argument("--generated", default=None)
    parser.add_argument("--write", action="store_true", help="Write io_model/io_data.json and io_model/io_employment.json.")
    parser.add_argument("--check-current", action="store_true", help="Compare generated source with current files.")
    args = parser.parse_args()

    generated = args.generated
    if generated is None and args.source_output.exists():
        generated = json.loads(args.source_output.read_text(encoding="utf-8")).get("metadata", {}).get("generated")
    if generated is None:
        generated = date.today().isoformat()

    source_payload, employment_payload = build_from_workbooks(args.io_workbook, args.employment_workbook, generated)

    if args.check_current:
        if args.source_output.exists():
            current = json.loads(args.source_output.read_text(encoding="utf-8"))
            current.pop("metadata", None)
            generated_source = json.loads(json.dumps(source_payload))
            generated_source.pop("metadata", None)
            issues = compare_payloads(generated_source, current)
            if issues:
                print("I-O source mismatch:")
                for issue in issues[:50]:
                    print(f"- {issue}")
                if len(issues) > 50:
                    print(f"- ... {len(issues) - 50} more")
                return 1
        if args.employment_output.exists():
            current_emp = json.loads(args.employment_output.read_text(encoding="utf-8"))
            current_emp_no_meta = {k: v for k, v in current_emp.items() if k != "metadata"}
            generated_emp_no_meta = {k: v for k, v in employment_payload.items() if k != "metadata"}
            issues = compare_payloads(generated_emp_no_meta, current_emp_no_meta)
            if issues:
                print("I-O employment source mismatch:")
                for issue in issues[:50]:
                    print(f"- {issue}")
                if len(issues) > 50:
                    print(f"- ... {len(issues) - 50} more")
                return 1

    if args.write:
        write_json(args.source_output, source_payload, pretty=False)
        write_json(args.employment_output, employment_payload)
        print(f"Wrote {args.source_output}")
        print(f"Wrote {args.employment_output}")
    else:
        print(
            json.dumps(
                {
                    "source": str(args.io_workbook),
                    "employment": str(args.employment_workbook),
                    "sectors": N_SECTORS,
                    "generated": generated,
                    "write": False,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
