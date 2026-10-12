"""Non-executing operational contract checks for Policy Chat dependencies."""

import math


class DependencyInvalid(ValueError):
    pass


def validate_manifest(manifest):
    try:
        if manifest["schema_version"] != "1.0" or not isinstance(manifest["policy_version"], str):
            raise ValueError()
        if not isinstance(manifest["routes"], dict) or not isinstance(manifest["variants"], list):
            raise ValueError()
        identities = set()
        for variant in manifest["variants"]:
            if not isinstance(variant["id"], str) or variant["id"] in identities:
                raise ValueError()
            identities.add(variant["id"])
            for key in ("model", "calibration_version"):
                if not isinstance(variant[key], str) or not variant[key]:
                    raise ValueError()
            for key in ("artifacts", "freshness", "disclosures"):
                if not isinstance(variant[key], list):
                    raise ValueError()
            approval = variant["approval"]
            if any(not isinstance(approval[key], bool) for key in ("diagnostic", "authoritative")):
                raise ValueError()
            for artifact in variant["artifacts"]:
                if not isinstance(artifact["path"], str) or not isinstance(
                    artifact["semantic_sha256"], str
                ):
                    raise ValueError()
                if len(artifact["semantic_sha256"]) != 64:
                    raise ValueError()
    except (KeyError, TypeError, ValueError) as error:
        raise DependencyInvalid("manifest_schema_incompatible") from error
    return manifest


def validate_artifact(model, value):
    """Validate the arrays/fields consumed by exposed kernels, without running them."""

    def number(item):
        return isinstance(item, (int, float)) and not isinstance(item, bool) and math.isfinite(item)

    def vector(item, length):
        return isinstance(item, list) and len(item) == length and all(number(x) for x in item)

    def matrix(item, rows, columns):
        return (
            isinstance(item, list) and len(item) == rows and all(vector(x, columns) for x in item)
        )

    try:
        if not isinstance(value, dict):
            raise ValueError()
        if model == "dfm":
            params = value["params"]
            n, m = len(params["means"]), len(params["Z_last"])
            if n < 1 or m < 1 or not all(vector(params[key], n) for key in ("means", "sdevs")):
                raise ValueError()
            if any(x <= 0 for x in params["sdevs"]) or not vector(params["Z_last"], m):
                raise ValueError()
            for key, rows, cols in (
                ("C", n, m),
                ("A", m, m),
                ("Q", m, m),
                ("R", n, n),
                ("V_last", m, m),
            ):
                if not matrix(params[key], rows, cols):
                    raise ValueError()
            index = value.get("vars", {}).get("gdp_idx", params.get("gdp_idx", 0))
            if not isinstance(index, int) or isinstance(index, bool) or not 0 <= index < n:
                raise ValueError()
            if not isinstance(value["meta"], dict):
                raise ValueError()
        elif model == "io":
            codes = value["codes"]
            n = len(codes)
            if n < 1 or len(set(codes)) != n or not all(isinstance(x, str) for x in codes):
                raise ValueError()
            if (
                not isinstance(value["names"], list)
                or len(value["names"]) != n
                or not all(isinstance(x, str) for x in value["names"])
            ):
                raise ValueError()
            for key in ("X", "GVA", "EmpTotal", "EmpFormal", "EmpInformal"):
                if not vector(value[key], n):
                    raise ValueError()
            if not matrix(value["L"], n, n) or sum(value["X"]) <= 0:
                raise ValueError()
        elif model == "qpm":
            if (
                value["schema_version"] != "1.0.0"
                or value["model_id"] != "qpm-core"
                or value["frequency"] != "quarterly"
            ):
                raise ValueError()
            if not isinstance(value["equations"], dict) or not isinstance(
                value["parameters"], dict
            ):
                raise ValueError()
            from helpers.validation import QPM_PARAM_RANGES, QPM_DEFAULTS

            if set(value["parameters"]) != set(QPM_PARAM_RANGES):
                raise ValueError()
            for key, (minimum, maximum, default) in QPM_PARAM_RANGES.items():
                rule = value["parameters"][key]
                if (rule["minimum"], rule["maximum"], rule["default"]) != (
                    minimum,
                    maximum,
                    default,
                ):
                    raise ValueError()
            if (
                value["solver"]["external_demand_persistence"] != 0.75
                or value["model_version"] != "0.3.0"
            ):
                raise ValueError()
            if any(
                value["steady_state"][key]["default"] != default
                for key, default in QPM_DEFAULTS.items()
            ):
                raise ValueError()
            for rule in value["parameters"].values():
                if not all(number(rule[key]) for key in ("default", "minimum", "maximum")):
                    raise ValueError()
                if not rule["minimum"] <= rule["default"] <= rule["maximum"]:
                    raise ValueError()
    except (KeyError, TypeError, ValueError, OverflowError) as error:
        raise DependencyInvalid("artifact_schema_incompatible") from error


def unavailable(code, variant="unknown"):
    return {
        "variant": variant,
        "intent": "diagnostic",
        "status": "blocked",
        "operational_availability": "unavailable",
        "qualification": "unavailable",
        "approval": {"authoritative": False, "diagnostic": False},
        "disclosures": [],
        "reasons": [
            {
                "code": code,
                "message": "Required dependency is unavailable or incompatible.",
                "blocking": True,
            }
        ],
    }
