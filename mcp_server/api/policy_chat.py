"""Governed internal Policy Chat API.

Interpretation is deterministic. Model output never comes from the chat layer:
each call is proposed, reviewed, hashed, validated, and explicitly confirmed.
"""

from __future__ import annotations
import hashlib
import hmac
import json
import os
import re
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from time import monotonic
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .policy_chat_runners import EngineModelRunner, PolicyModelRunner
from .policy_chat_store import PolicyChatStore

CAPABILITY_VERSION = "policy-chat-mvp-v1"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
Locale = Literal["en", "ru", "uz"]
ModelId = Literal["qpm", "dfm", "io"]
Operation = Literal["qpm_impulse_response", "dfm_nowcast", "io_demand_shock"]
SUPPORTED_MODELS = ("qpm", "dfm", "io")


@dataclass(frozen=True)
class PolicyChatSettings:
    enabled: bool = False
    auth_mode: Literal["disabled", "dev_header", "trusted_proxy"] = "disabled"
    proxy_secret: str = ""
    state_path: str = ":memory:"
    enabled_models: tuple[str, ...] = SUPPORTED_MODELS
    max_runs_per_minute: int = 10

    @classmethod
    def from_env(cls):
        mode = os.getenv("POLICY_CHAT_AUTH_MODE", "disabled")
        if mode not in {"disabled", "dev_header", "trusted_proxy"}:
            mode = "disabled"
        configured_models = tuple(
            model.strip()
            for model in os.getenv(
                "POLICY_CHAT_ENABLED_MODELS",
                ",".join(SUPPORTED_MODELS),
            ).split(",")
            if model.strip() in SUPPORTED_MODELS
        )
        try:
            rate_limit = int(os.getenv("POLICY_CHAT_MAX_RUNS_PER_MINUTE", "10"))
        except ValueError:
            rate_limit = 10
        return cls(
            enabled=os.getenv("POLICY_CHAT_ENABLED", "false").lower() == "true",
            auth_mode=mode,  # type: ignore[arg-type]
            proxy_secret=os.getenv("POLICY_CHAT_PROXY_SECRET", ""),
            state_path=os.getenv("POLICY_CHAT_STATE_PATH", ":memory:"),
            enabled_models=configured_models,
            max_runs_per_minute=max(1, min(rate_limit, 1_000)),
        )


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProposeRequest(StrictModel):
    message: str = Field(min_length=3, max_length=2_000)
    locale: Locale = "en"
    client_turn_id: str = Field(min_length=8, max_length=100)


class ParameterRange(StrictModel):
    min: float
    max: float


class ProposalParameter(StrictModel):
    key: str
    label: str
    value: str | float | int
    unit: str | None
    origin: Literal["user_stated", "inferred", "model_default"]
    editable: bool
    allowed_range: ParameterRange | None = None


class ProposalWarning(StrictModel):
    code: str
    message: str
    blocking: bool = False


class ProposalResponse(StrictModel):
    type: Literal["proposal"] = "proposal"
    proposal_id: str
    model_id: ModelId
    model_name: str
    operation: Operation
    locale: Locale
    summary: str
    parameters: list[ProposalParameter]
    warnings: list[ProposalWarning]
    caveat: str
    capability_version: str = CAPABILITY_VERSION
    proposal_hash: str
    created_at: str


class ProposalPatchRequest(StrictModel):
    values: dict[str, str | float | int]


class ExecuteRequest(StrictModel):
    proposal_hash: str = Field(min_length=20, max_length=100)
    confirmation: bool
    client_request_id: str = Field(min_length=8, max_length=100)


class ModelAttribution(StrictModel):
    model_id: str
    model_name: str
    module: str
    version: str
    run_id: str
    data_version: str
    timestamp: str


class Explanation(StrictModel):
    summary: str
    interpretation: list[str]
    limitations: list[str]
    grounding_status: Literal["deterministic_fallback"] = "deterministic_fallback"


class RunResponse(StrictModel):
    run_id: str
    proposal_id: str
    proposal_hash: str
    model_id: ModelId
    operation: Operation
    locale: Locale
    status: Literal["succeeded"] = "succeeded"
    model_attribution: list[ModelAttribution]
    confirmed_parameters: list[ProposalParameter]
    normalized_result: dict
    explanation: Explanation
    started_at: str
    completed_at: str


class RunRateLimiter:
    """Per-process safety backstop; the trusted proxy remains the outer quota."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = RLock()

    def reserve(self, owner: str) -> None:
        now = monotonic()
        with self._lock:
            attempts = self._attempts[owner]
            while attempts and attempts[0] <= now - 60:
                attempts.popleft()
            if len(attempts) >= self.limit:
                raise HTTPException(
                    status_code=429,
                    detail={"code": "run_rate_limit_exceeded"},
                    headers={"Retry-After": "60"},
                )
            attempts.append(now)


def _text(locale, en, ru, uz):
    return {"en": en, "ru": ru, "uz": uz}[locale]


def _fail(locale, code, en, ru, uz, status=422):
    return HTTPException(
        status_code=status, detail={"code": code, "message": _text(locale, en, ru, uz)}
    )


def _normalize(message):
    return " ".join(message.lower().replace(",", ".").replace("’", "'").split())


def _has(message, terms):
    return any(term in message for term in terms)


def _number_with_unit(message, pattern):
    match = re.search(rf"([+-]?\d+(?:\.\d+)?)\s*(?:{pattern})", message, re.IGNORECASE)
    return float(match.group(1)) if match else None


def _parse_qpm(message, locale):
    rules = (
        (
            "external_demand",
            (
                "external demand",
                "foreign demand",
                "russia demand",
                "внешн",
                "tashqi talab",
                "rossiya talabi",
            ),
        ),
        (
            "risk",
            (
                "risk premium",
                "country risk",
                "capital flight",
                "преми",
                "отток капит",
                "risk mukofot",
                "kapital chiq",
            ),
        ),
        (
            "exchange",
            (
                "exchange rate",
                "depreciation",
                "appreciation",
                "обменн",
                "девальва",
                "укреплен",
                "valyuta kurs",
                "qadrsizlan",
            ),
        ),
        (
            "inflation",
            (
                "cost push",
                "cost-push",
                "inflation shock",
                "price shock",
                "инфляцион",
                "ценов",
                "inflyats",
                "narx shok",
            ),
        ),
        (
            "demand",
            (
                "aggregate demand",
                "demand shock",
                "domestic demand",
                "шок спрос",
                "совокупн",
                "yalpi talab",
                "talab shok",
            ),
        ),
        (
            "monetary",
            (
                "policy rate",
                "interest rate",
                "monetary",
                "tightening",
                "easing",
                "ставк",
                "денежно",
                "foiz stavk",
                "pul-kredit",
            ),
        ),
    )
    shock = next((kind for kind, terms in rules if _has(message, terms)), None)
    if shock is None:
        return None
    size = _number_with_unit(
        message,
        r"percentage\s*points?|pp|п\.?\s*п\.?|процентн\w*\s+пункт\w*|foiz\s*(?:punkt|band)\w*",
    )
    warnings, origin = [], "user_stated"
    if size is None:
        size, origin = 1.0, "model_default"
        warnings.append(
            ProposalWarning(
                code="default_shock_size",
                message=_text(
                    locale,
                    "No shock size was stated; the review shows the 1 percentage-point default.",
                    "Размер шока не указан; показано значение по умолчанию — 1 п.п.",
                    "Shok miqdori ko'rsatilmagan; 1 foiz punktlik standart qiymat ko'rsatildi.",
                ),
            )
        )
    if _has(
        message,
        (
            "cut",
            "lower",
            "easing",
            "appreciation",
            "сниз",
            "смягчен",
            "укреплен",
            "pasay",
            "kamay",
            "yumshat",
        ),
    ):
        size = -abs(size)
    elif _has(
        message,
        (
            "raise",
            "increase",
            "tightening",
            "depreciation",
            "повыс",
            "ужесточ",
            "девальва",
            "oshir",
            "qat'iylasht",
        ),
    ):
        size = abs(size)
    match = re.search(r"(\d{1,2})\s*(?:quarters?|квартал\w*|chorak)", message)
    horizon = int(match.group(1)) if match else 16
    if not 8 <= horizon <= 32:
        raise _fail(
            locale,
            "invalid_horizon",
            "Use 8 to 32 quarters.",
            "Используйте от 8 до 32 кварталов.",
            "8–32 chorakdan foydalaning.",
        )
    if not -20 <= size <= 20:
        raise _fail(
            locale,
            "invalid_shock_size",
            "Use a shock between -20 and 20 percentage points.",
            "Используйте шок от -20 до 20 п.п.",
            "-20 dan 20 foiz punktgacha shokdan foydalaning.",
        )
    return [
        ProposalParameter(
            key="shock_type",
            label="Shock channel",
            value=shock,
            unit=None,
            origin="inferred",
            editable=False,
        ),
        ProposalParameter(
            key="shock_size",
            label="Shock size",
            value=size,
            unit="percentage points",
            origin=origin,
            editable=True,
            allowed_range=ParameterRange(min=-20, max=20),
        ),
        ProposalParameter(
            key="horizon",
            label="Analysis horizon",
            value=horizon,
            unit="quarters",
            origin="user_stated" if match else "model_default",
            editable=True,
            allowed_range=ParameterRange(min=8, max=32),
        ),
    ], warnings


def _parse_dfm(message, locale):
    del locale
    if not _has(
        message,
        (
            "nowcast",
            "latest gdp",
            "gdp growth",
            "confidence interval",
            "uncertainty range",
            "наукаст",
            "текущая оценка ввп",
            "рост ввп",
            "неопредел",
            "yaim",
            "joriy baho",
            "ishonch oralig",
            "noaniqlik",
        ),
    ):
        return None
    return [
        ProposalParameter(
            key="retrieval",
            label="Retrieval",
            value="latest_nowcast",
            unit=None,
            origin="inferred",
            editable=False,
        ),
        ProposalParameter(
            key="artifact",
            label="Approved artifact",
            value="dfm_data.json",
            unit=None,
            origin="model_default",
            editable=False,
        ),
    ], []


def _parse_io(message, locale):
    rules = (
        (
            "investment",
            (
                "investment",
                "infrastructure",
                "capital spending",
                "инвестиц",
                "инфраструктур",
                "investits",
                "infratuzilma",
            ),
        ),
        (
            "government",
            (
                "government spending",
                "public spending",
                "государственн",
                "бюджетн",
                "davlat xarajat",
                "hukumat xarajat",
            ),
        ),
        (
            "consumption",
            ("consumption", "household demand", "потреблен", "домохозяй", "iste'mol", "uy xo'jal"),
        ),
        ("exports", ("export demand", "exports", "экспорт", "eksport")),
    )
    bucket = next((kind for kind, terms in rules if _has(message, terms)), None)
    if bucket is None and not _has(
        message,
        (
            "input-output",
            "i-o",
            "leontief",
            "sector multiplier",
            "затраты-выпуск",
            "леонтьев",
            "tarmoqlararo",
        ),
    ):
        return None
    bucket = bucket or "investment"
    match = re.search(
        r"([+-]?\d+(?:\.\d+)?)\s*(trillion|trln|трлн|billion|bln|bn|млрд|mlrd)",
        message,
        re.IGNORECASE,
    )
    warnings, origin = [], "user_stated"
    if match:
        amount = float(match.group(1)) * (
            1000 if match.group(2).lower() in {"trillion", "trln", "трлн"} else 1
        )
    else:
        amount, origin = 100.0, "model_default"
        warnings.append(
            ProposalWarning(
                code="default_io_amount",
                message=_text(
                    locale,
                    "No amount was stated; the review shows a UZS 100 billion default.",
                    "Сумма не указана; показано значение по умолчанию 100 млрд сумов.",
                    "Miqdor ko'rsatilmagan; 100 mlrd so'mlik standart qiymat ko'rsatildi.",
                ),
            )
        )
    if _has(message, ("reduction", "decrease", "cut", "сокращ", "сниз", "kamay", "pasay")):
        amount = -abs(amount)
    if amount == 0 or not -1_000_000 <= amount <= 1_000_000:
        raise _fail(
            locale,
            "invalid_io_amount",
            "Use a non-zero I-O shock within ±UZS 1,000,000 billion.",
            "Используйте ненулевой шок I-O в пределах ±1 000 000 млрд сумов.",
            "Noldan farqli, ±1 000 000 mlrd so'm oralig'idagi I-O shokidan foydalaning.",
        )
    sector = re.search(r"\b([A-Z]\d{2}(?:\.\d{1,2})?)\b", message, re.IGNORECASE)
    return [
        ProposalParameter(
            key="demand_bucket",
            label="Final-demand channel",
            value=bucket,
            unit=None,
            origin="inferred",
            editable=False,
        ),
        ProposalParameter(
            key="amount_bln_uzs",
            label="Demand shock",
            value=amount,
            unit="billion UZS",
            origin=origin,
            editable=True,
            allowed_range=ParameterRange(min=-1_000_000, max=1_000_000),
        ),
        ProposalParameter(
            key="distribution",
            label="Distribution",
            value="output",
            unit=None,
            origin="model_default",
            editable=False,
        ),
        ProposalParameter(
            key="sector_code",
            label="Sector",
            value=sector.group(1).upper() if sector else "all_sectors",
            unit=None,
            origin="user_stated" if sector else "model_default",
            editable=False,
        ),
        ProposalParameter(
            key="base_year",
            label="I-O base year",
            value=2022,
            unit="year",
            origin="model_default",
            editable=False,
        ),
    ], warnings


def _model_for(message, locale):
    normalized = _normalize(message)
    for model_id, operation, name, parser in (
        ("dfm", "dfm_nowcast", "Dynamic Factor Model", _parse_dfm),
        ("io", "io_demand_shock", "Input-Output Model", _parse_io),
        ("qpm", "qpm_impulse_response", "Quarterly Projection Model", _parse_qpm),
    ):
        parsed = parser(normalized, locale)
        if parsed:
            parameters, warnings = parsed
            return model_id, operation, name, parameters, warnings
    raise _fail(
        locale,
        "unsupported_scenario",
        "Supported requests are QPM macro shocks, the approved DFM nowcast, and I-O final-demand shocks.",
        "Поддерживаются макрошоки QPM, утверждённый наукаст DFM и шоки конечного спроса I-O.",
        "QPM makroshoklari, tasdiqlangan DFM joriy bahosi va I-O yakuniy talab shoklari qo'llab-quvvatlanadi.",
    )


def _values(parameters):
    return {item.key: item.value for item in parameters}


def _hash(model_id, operation, parameters):
    payload = {
        "capability_version": CAPABILITY_VERSION,
        "model_id": model_id,
        "operation": operation,
        "parameters": [
            {"key": p.key, "origin": p.origin, "value": p.value}
            for p in sorted(parameters, key=lambda p: p.key)
        ],
    }
    return (
        "sha256:"
        + hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
    )


def _scenario_label(locale, value):
    labels = {
        "ru": {
            "monetary": "денежно-кредитной политики",
            "demand": "спроса",
            "inflation": "инфляции",
            "exchange": "валютного курса",
            "risk": "премии за риск",
            "external_demand": "внешнего спроса",
            "investment": "инвестиций",
            "government": "государственных расходов",
            "consumption": "потребления",
            "exports": "экспорта",
        },
        "uz": {
            "monetary": "pul-kredit",
            "demand": "talab",
            "inflation": "inflyatsiya",
            "exchange": "valyuta kursi",
            "risk": "risk mukofoti",
            "external_demand": "tashqi talab",
            "investment": "investitsiya",
            "government": "davlat xarajatlari",
            "consumption": "iste'mol",
            "exports": "eksport",
        },
    }
    return labels.get(locale, {}).get(str(value), str(value).replace("_", " "))


def _summary(model_id, parameters, locale):
    v = _values(parameters)
    if model_id == "qpm":
        label = _scenario_label(locale, v["shock_type"])
        return _text(
            locale,
            f"Run a {v['shock_size']:g} percentage-point {label} shock over {v['horizon']} quarters.",
            f"Рассчитать шок {label} величиной {v['shock_size']:g} п.п. на горизонте {v['horizon']} кварталов.",
            f"{v['horizon']} chorak davomida {v['shock_size']:g} foiz punktlik {label} shokini hisoblash.",
        )
    if model_id == "dfm":
        return _text(
            locale,
            "Retrieve the latest approved GDP nowcast and uncertainty bands.",
            "Получить последнюю утверждённую текущую оценку ВВП и интервалы неопределённости.",
            "YAIMning so'nggi tasdiqlangan joriy bahosi va noaniqlik oraliqlarini olish.",
        )
    label = _scenario_label(locale, v["demand_bucket"])
    return _text(
        locale,
        f"Run a UZS {v['amount_bln_uzs']:g} billion {label} shock through the 2022 I-O table.",
        f"Рассчитать шок {label} на {v['amount_bln_uzs']:g} млрд сумов по таблице I-O 2022 года.",
        f"2022 yil I-O jadvali bo'yicha {label} talabiga {v['amount_bln_uzs']:g} mlrd so'mlik shokni hisoblash.",
    )


def _caveat(model_id, locale):
    return {
        "qpm": _text(
            locale,
            "QPM responses are calibrated deviations from baseline, not an official forecast.",
            "Отклики QPM — калиброванные отклонения, а не официальный прогноз.",
            "QPM javoblari kalibrlangan og'ishlar bo'lib, rasmiy prognoz emas.",
        ),
        "dfm": _text(
            locale,
            "DFM output is a model current estimate, not an official GDP release.",
            "Результат DFM — модельная оценка, а не официальный выпуск ВВП.",
            "DFM natijasi model bahosi bo'lib, rasmiy YAIM e'loni emas.",
        ),
        "io": _text(
            locale,
            "I-O effects use the static 2022 structure; they are not a time path or general equilibrium.",
            "Эффекты I-O используют статическую структуру 2022 года и не являются общим равновесием.",
            "I-O ta'sirlari 2022 yil statik tuzilmasiga asoslangan; ular umumiy muvozanat natijasi emas.",
        ),
    }[model_id]


def _explain(model_id, result, locale):
    if model_id == "qpm":
        out, inf, rate = (
            result["peaks"]["output_gap"],
            result["peaks"]["inflation_yoy"],
            result["peaks"]["policy_rate"],
        )
        return Explanation(
            summary=_text(
                locale,
                f"The largest output-gap response is {out['value']:.2f} percentage points in quarter {out['quarter']}; inflation peaks at {inf['value']:.2f}.",
                f"Максимальный отклик разрыва выпуска — {out['value']:.2f} п.п. в квартале {out['quarter']}; инфляции — {inf['value']:.2f} п.п.",
                f"Ishlab chiqarish tafovutining eng katta javobi {out['quarter']}-chorakda {out['value']:.2f} foiz punkt; inflyatsiya {inf['value']:.2f} punkt.",
            ),
            interpretation=[
                _text(
                    locale,
                    f"The policy-rate deviation peaks at {rate['value']:.2f} in quarter {rate['quarter']}.",
                    f"Отклонение ставки достигает {rate['value']:.2f} п.п. в квартале {rate['quarter']}.",
                    f"Siyosat stavkasi og'ishi {rate['quarter']}-chorakda {rate['value']:.2f} punktga yetadi.",
                ),
                _text(
                    locale,
                    "Responses are QPM deviations from baseline.",
                    "Отклики QPM являются отклонениями от базы.",
                    "QPM javoblari bazadan og'ishlardir.",
                ),
            ],
            limitations=[
                _text(
                    locale,
                    "This is a model scenario, not an official forecast.",
                    "Это модельный сценарий, а не официальный прогноз.",
                    "Bu model ssenariysi, rasmiy prognoz emas.",
                ),
                _text(
                    locale,
                    "Parameter uncertainty is not included.",
                    "Неопределённость параметров не включена.",
                    "Parametr noaniqligi kiritilmagan.",
                ),
            ],
        )
    if model_id == "dfm":
        value, status = result["gdp_nowcast_yoy_pct"], result["model_status"]
        ci = result.get("forecasts", [{}])[0].get("ci_90", [None, None])
        return Explanation(
            summary=_text(
                locale,
                f"The latest model-based GDP growth estimate is {value:.2f}% year on year.",
                f"Последняя модельная оценка роста ВВП — {value:.2f}% г/г.",
                f"YAIM o'sishining so'nggi model bahosi yiliga {value:.2f}%.",
            ),
            interpretation=[
                _text(
                    locale,
                    f"The nearest 90% interval is {ci[0]}% to {ci[1]}%.",
                    f"Ближайший 90%-й интервал: {ci[0]}–{ci[1]}%.",
                    f"Eng yaqin 90% oraliq: {ci[0]}–{ci[1]}%.",
                ),
                _text(
                    locale,
                    f"Latest artifact date: {status.get('last_data_date') or 'not stated'}.",
                    f"Последняя дата данных: {status.get('last_data_date') or 'не указана'}.",
                    f"So'nggi ma'lumot sanasi: {status.get('last_data_date') or 'ko’rsatilmagan'}.",
                ),
            ],
            limitations=[
                _text(
                    locale,
                    "This is not an official GDP release.",
                    "Это не официальный выпуск ВВП.",
                    "Bu rasmiy YAIM e'loni emas.",
                ),
                _text(
                    locale,
                    "Monthly-indicator revisions can change the estimate.",
                    "Ревизии месячных индикаторов могут изменить оценку.",
                    "Oylik ko'rsatkichlar qayta ko'rib chiqilsa, baho o'zgarishi mumkin.",
                ),
            ],
        )
    agg = result["aggregate"]
    return Explanation(
        summary=_text(
            locale,
            f"Total output changes by UZS {agg['total_output_effect_bln_uzs']:,.2f} billion and value added by UZS {agg['total_va_effect_bln_uzs']:,.2f} billion.",
            f"Совокупный выпуск меняется на {agg['total_output_effect_bln_uzs']:,.2f} млрд сумов, добавленная стоимость — на {agg['total_va_effect_bln_uzs']:,.2f} млрд.",
            f"Jami ishlab chiqarish {agg['total_output_effect_bln_uzs']:,.2f} mlrd so'mga, qo'shilgan qiymat {agg['total_va_effect_bln_uzs']:,.2f} mlrdga o'zgaradi.",
        ),
        interpretation=[
            _text(
                locale,
                f"Output multiplier: {agg['aggregate_multiplier']:.3f}.",
                f"Мультипликатор выпуска: {agg['aggregate_multiplier']:.3f}.",
                f"Ishlab chiqarish multiplikatori: {agg['aggregate_multiplier']:.3f}.",
            ),
            _text(
                locale,
                f"Employment effect: {agg['total_employment_effect_persons']:,.0f} persons.",
                f"Эффект занятости: {agg['total_employment_effect_persons']:,.0f} человек.",
                f"Bandlik ta'siri: {agg['total_employment_effect_persons']:,.0f} kishi.",
            ),
        ],
        limitations=[
            _text(
                locale,
                "The model uses the static 2022 I-O structure.",
                "Модель использует статическую структуру I-O 2022 года.",
                "Model 2022 yil statik I-O tuzilmasidan foydalanadi.",
            ),
            _text(
                locale,
                "Prices, capacity limits, and general equilibrium are excluded.",
                "Цены, ограничения мощностей и общее равновесие не учитываются.",
                "Narxlar, quvvat cheklovlari va umumiy muvozanat kiritilmagan.",
            ),
        ],
    )


def create_policy_chat_router(
    settings: PolicyChatSettings | None = None,
    store: PolicyChatStore | None = None,
    runner: PolicyModelRunner | None = None,
):
    runtime = settings or PolicyChatSettings.from_env()
    state = store or PolicyChatStore(runtime.state_path)
    model_runner = runner or EngineModelRunner(DATA_DIR)
    rate_limiter = RunRateLimiter(runtime.max_runs_per_minute)
    execution_lock = RLock()
    router = APIRouter(prefix="/api/v1/policy-chat", tags=["policy-chat"])

    def require_user(
        x_policy_chat_user: Annotated[str | None, Header()] = None,
        x_policy_chat_proxy_secret: Annotated[str | None, Header()] = None,
    ):
        if not runtime.enabled:
            raise HTTPException(
                status_code=404,
                detail={"code": "policy_chat_disabled", "message": "Policy Chat is disabled."},
            )
        if runtime.auth_mode == "disabled":
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "identity_not_configured",
                    "message": "Policy Chat identity is not configured.",
                },
            )
        if runtime.auth_mode == "trusted_proxy" and (
            not runtime.proxy_secret
            or not x_policy_chat_proxy_secret
            or not hmac.compare_digest(runtime.proxy_secret, x_policy_chat_proxy_secret)
        ):
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "authentication_required",
                    "message": "Verified internal identity is required.",
                },
            )
        if not x_policy_chat_user or not x_policy_chat_user.strip():
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "authentication_required",
                    "message": "Sign in to use Policy Chat.",
                },
            )
        return x_policy_chat_user.strip()[:120]

    def owned_proposal(proposal_id: str, user: str) -> ProposalResponse:
        record = state.get_proposal(proposal_id)
        if record is None or record[0] != user:
            raise HTTPException(
                status_code=404,
                detail={"code": "proposal_not_found"},
            )
        return ProposalResponse.model_validate(record[1])

    @router.get("/capabilities")
    def capabilities(user: str = Depends(require_user)):
        definitions = [
            {
                "model_id": "qpm",
                "operations": ["qpm_impulse_response"],
                "status": "enabled",
            },
            {
                "model_id": "dfm",
                "operations": ["dfm_nowcast"],
                "status": "enabled",
                "mode": "read_only",
            },
            {
                "model_id": "io",
                "operations": ["io_demand_shock"],
                "status": "enabled",
            },
        ]
        state.append_event(
            "capabilities_viewed",
            user,
            metadata={"capability_version": CAPABILITY_VERSION},
        )
        return {
            "capability_version": CAPABILITY_VERSION,
            "models": [item for item in definitions if item["model_id"] in runtime.enabled_models],
        }

    @router.post("/proposals", response_model=ProposalResponse)
    def create(request: ProposeRequest, user: str = Depends(require_user)):
        model_id, operation, name, parameters, warnings = _model_for(
            request.message,
            request.locale,
        )
        if model_id not in runtime.enabled_models:
            state.append_event(
                "proposal_rejected",
                user,
                metadata={"model_id": model_id, "reason": "model_disabled"},
            )
            raise HTTPException(
                status_code=422,
                detail={"code": "model_disabled", "model_id": model_id},
            )
        proposal_id = str(uuid4())
        response = ProposalResponse(
            proposal_id=proposal_id,
            model_id=model_id,
            model_name=name,
            operation=operation,
            locale=request.locale,
            summary=_summary(model_id, parameters, request.locale),
            parameters=parameters,
            warnings=warnings,
            caveat=_caveat(model_id, request.locale),
            proposal_hash=_hash(model_id, operation, parameters),
            created_at=datetime.now(UTC).isoformat(),
        )
        state.put_proposal(user, response.model_dump(mode="json"))
        state.append_event(
            "proposal_created",
            user,
            proposal_id=proposal_id,
            metadata={
                "model_id": model_id,
                "operation": operation,
                "proposal_hash": response.proposal_hash,
                "client_turn_id": request.client_turn_id,
            },
        )
        return response

    @router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
    def edit(
        proposal_id: str,
        request: ProposalPatchRequest,
        user: str = Depends(require_user),
    ):
        current = owned_proposal(proposal_id, user)
        editable = {parameter.key for parameter in current.parameters if parameter.editable}
        if not request.values or set(request.values) - editable:
            raise HTTPException(
                status_code=422,
                detail={"code": "proposal_field_not_editable"},
            )
        updated = []
        for parameter in current.parameters:
            if parameter.key not in request.values:
                updated.append(parameter)
                continue
            try:
                value = float(request.values[parameter.key])
            except (TypeError, ValueError) as error:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "invalid_parameter_value",
                        "parameter": parameter.key,
                    },
                ) from error
            if parameter.key == "horizon" and not value.is_integer():
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "invalid_parameter_value",
                        "parameter": parameter.key,
                    },
                )
            value = int(value) if parameter.key == "horizon" else value
            if parameter.allowed_range and not (
                parameter.allowed_range.min <= value <= parameter.allowed_range.max
            ):
                raise HTTPException(
                    status_code=422,
                    detail={
                        "code": "parameter_out_of_range",
                        "parameter": parameter.key,
                    },
                )
            if parameter.key == "amount_bln_uzs" and value == 0:
                raise HTTPException(
                    status_code=422,
                    detail={"code": "invalid_io_amount"},
                )
            updated.append(parameter.model_copy(update={"value": value, "origin": "user_stated"}))
        response = current.model_copy(
            update={
                "parameters": updated,
                "summary": _summary(current.model_id, updated, current.locale),
                "proposal_hash": _hash(current.model_id, current.operation, updated),
                "warnings": [],
            }
        )
        state.put_proposal(user, response.model_dump(mode="json"))
        state.append_event(
            "proposal_edited",
            user,
            proposal_id=proposal_id,
            metadata={
                "model_id": current.model_id,
                "previous_hash": current.proposal_hash,
                "proposal_hash": response.proposal_hash,
                "edited_fields": sorted(request.values),
            },
        )
        return response

    @router.post("/proposals/{proposal_id}/execute", response_model=RunResponse)
    def execute(
        proposal_id: str,
        request: ExecuteRequest,
        user: str = Depends(require_user),
    ):
        proposal = owned_proposal(proposal_id, user)
        if not request.confirmation:
            raise HTTPException(
                status_code=422,
                detail={"code": "confirmation_required"},
            )
        if request.proposal_hash != proposal.proposal_hash:
            state.append_event(
                "confirmation_rejected",
                user,
                proposal_id=proposal_id,
                metadata={"reason": "stale_proposal"},
            )
            raise HTTPException(
                status_code=409,
                detail={"code": "stale_proposal"},
            )
        if proposal.model_id not in runtime.enabled_models:
            raise HTTPException(
                status_code=503,
                detail={"code": "model_disabled", "model_id": proposal.model_id},
            )

        with execution_lock:
            existing = state.get_run(user, request.client_request_id)
            if existing is not None:
                return RunResponse.model_validate(existing)
            rate_limiter.reserve(user)
            state.append_event(
                "run_confirmed",
                user,
                proposal_id=proposal_id,
                metadata={
                    "model_id": proposal.model_id,
                    "operation": proposal.operation,
                    "proposal_hash": proposal.proposal_hash,
                    "client_request_id": request.client_request_id,
                },
            )
            started = datetime.now(UTC).isoformat()
            try:
                model_run = model_runner.run(
                    proposal.model_id,
                    _values(proposal.parameters),
                )
            except HTTPException as error:
                code = (
                    error.detail.get("code", "model_execution_failed")
                    if isinstance(error.detail, dict)
                    else "model_execution_failed"
                )
                state.append_event(
                    "run_failed",
                    user,
                    proposal_id=proposal_id,
                    metadata={"model_id": proposal.model_id, "code": code},
                )
                raise
            except Exception as error:
                state.append_event(
                    "run_failed",
                    user,
                    proposal_id=proposal_id,
                    metadata={
                        "model_id": proposal.model_id,
                        "code": "model_execution_failed",
                    },
                )
                raise HTTPException(
                    status_code=503,
                    detail={"code": "model_execution_failed"},
                ) from error

            run_id = str(uuid4())
            completed = datetime.now(UTC).isoformat()
            response = RunResponse(
                run_id=run_id,
                proposal_id=proposal_id,
                proposal_hash=proposal.proposal_hash,
                model_id=proposal.model_id,
                operation=proposal.operation,
                locale=proposal.locale,
                model_attribution=[
                    ModelAttribution(
                        model_id=proposal.model_id,
                        model_name=proposal.model_name,
                        module=model_run.module,
                        version="1.0.0",
                        run_id=run_id,
                        data_version=model_run.data_version,
                        timestamp=completed,
                    )
                ],
                confirmed_parameters=proposal.parameters,
                normalized_result=model_run.result,
                explanation=_explain(
                    proposal.model_id,
                    model_run.result,
                    proposal.locale,
                ),
                started_at=started,
                completed_at=completed,
            )
            persisted = RunResponse.model_validate(
                state.put_run(
                    user,
                    request.client_request_id,
                    response.model_dump(mode="json"),
                )
            )
            state.append_event(
                "run_succeeded",
                user,
                proposal_id=proposal_id,
                run_id=persisted.run_id,
                metadata={
                    "model_id": proposal.model_id,
                    "operation": proposal.operation,
                    "data_version": model_run.data_version,
                },
            )
            return persisted

    return router
