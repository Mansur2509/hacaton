from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")


EXPLANATION_KEYS = {
    "recommendation",
    "reasoning",
    "tradeoffs",
    "confidence",
    "signal_focus",
    "best_signal_id",
    "scope",
    "expected_impact",
}


def _normalize_language(language: str | None) -> str:
    return "ru" if str(language or "").lower().startswith("ru") else "en"


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clean_json_response(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    return cleaned


def _normalize_explanation(payload: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return fallback

    result = dict(fallback)
    for key in EXPLANATION_KEYS - {"tradeoffs", "best_signal_id"}:
        value = payload.get(key)
        if isinstance(value, (str, int, float)) and str(value).strip():
            result[key] = str(value).strip()

    signal_id = payload.get("best_signal_id")
    if signal_id is not None and str(signal_id).strip():
        result["best_signal_id"] = str(signal_id).strip()

    tradeoffs = payload.get("tradeoffs")
    if isinstance(tradeoffs, list):
        normalized = [str(item).strip() for item in tradeoffs if str(item).strip()]
    elif isinstance(tradeoffs, str):
        normalized = [tradeoffs.strip()] if tradeoffs.strip() else []
    else:
        normalized = []

    if normalized:
        result["tradeoffs"] = normalized[:4]

    return result


def _fallback_explanation(
    baseline: dict[str, Any],
    candidates: list[dict[str, Any]],
    best: dict[str, Any] | None = None,
    language: str = "en",
) -> dict[str, Any]:
    language = _normalize_language(language)
    best_name = best.get("label", best.get("id", "best intervention")) if best else "best intervention"
    best_category = best.get("category", "mobility") if best else "mobility"
    signal_id = (best or {}).get("intervention", {}).get("traffic_light_id") if best else None

    baseline_wait = _as_float(baseline.get("average_waiting_seconds"))
    baseline_speed = _as_float(baseline.get("average_speed_kmh"))
    baseline_co2 = _as_float(baseline.get("co2_kg"))
    baseline_access = _as_float(baseline.get("accessibility_score"), 100.0)

    best_metrics = (best or {}).get("metrics", {})
    best_wait = _as_float(best_metrics.get("average_waiting_seconds"), baseline_wait)
    best_speed = _as_float(best_metrics.get("average_speed_kmh"), baseline_speed)
    best_co2 = _as_float(best_metrics.get("co2_kg"), baseline_co2)
    best_access = _as_float(best_metrics.get("accessibility_score"), baseline_access)

    wait_delta = baseline_wait - best_wait
    speed_delta = best_speed - baseline_speed
    co2_delta = baseline_co2 - best_co2
    access_delta = best_access - baseline_access

    if language == "ru":
        impact = []
        if wait_delta > 0.5:
            impact.append(f"среднее ожидание снижается на {wait_delta:.1f} с")
        elif wait_delta < -0.5:
            impact.append(f"среднее ожидание растет на {abs(wait_delta):.1f} с")
        else:
            impact.append("среднее ожидание остается почти без изменений")

        if speed_delta > 0.5:
            impact.append(f"скорость потока повышается на {speed_delta:.1f} км/ч")
        elif speed_delta < -0.5:
            impact.append(f"скорость потока снижается на {abs(speed_delta):.1f} км/ч")

        if co2_delta > 0.1:
            impact.append(f"выбросы CO2 уменьшаются на {co2_delta:.1f} кг")

        if access_delta > 2.0:
            impact.append(f"доступность повышается до {best_access:.0f}%")

        impact_text = "; ".join(impact) if impact else "эффект распределен между несколькими показателями"
        signal_focus = (
            f"Фокус сигнала: {signal_id}. Мера нацелена на самый чувствительный светофорный кластер коридора, где быстрее всего накапливаются очереди."
            if signal_id
            else "Фокус сигнала: выбран вариант с лучшим балансом мобильности, выбросов, безопасности и доступности."
        )
        category_rationale = {
            "signal_timing": "Точная настройка фаз светофора повышает пропускную способность без капитального строительства.",
            "traffic_management": "Управление конфликтными маневрами снижает блокировки на поворотах и делает поток предсказуемее.",
            "transit": "Приоритет общественного транспорта делает автобусный коридор надежнее и снижает зависимость от личных поездок.",
            "active_mobility": "Приоритет пешеходов улучшает безопасность переходов и предсказуемость движения у социальных объектов.",
            "safety": "Меры успокоения движения защищают уязвимых участников, особенно рядом со школами и общественными зонами.",
            "curb_management": "Управление краткосрочной остановкой снижает хаотичный поиск парковки и поддерживает торговую активность.",
            "environment": "Экологичная настройка снижает холостой ход, выбросы и шум без ожидания полной инфраструктурной перестройки.",
        }
        confidence = "средняя" if len(candidates) > 3 and abs(wait_delta) > 1.0 else "низкая"

        return {
            "recommendation": (
                f"AI-провайдер недоступен; показано проверяемое объяснение на основе симуляции: внедрить «{best_name}». "
                f"{category_rationale.get(best_category, 'Мера улучшает локальные условия движения.')} "
                f"Ожидаемый эффект: {impact_text}."
            ),
            "reasoning": (
                f"Симуляция сравнила {len(candidates)} вариантов с базовым сценарием. "
                f"«{best_name}» выбран как лучший баланс между задержками, выбросами, доступностью пешеходов и устойчивостью локального коридора. "
                f"{signal_focus}"
            ),
            "tradeoffs": [
                "Рекомендация основана на симуляции; после внедрения результат нужно подтвердить полевыми наблюдениями.",
                "Оптимизация не подгоняет один показатель любой ценой: учитываются задержки, скорость, выбросы, безопасность и доступность.",
                "Финальное решение должно учитывать бюджет, организацию работ и обратную связь жителей махалли.",
            ],
            "confidence": confidence,
            "signal_focus": signal_focus,
            "best_signal_id": signal_id,
            "scope": "Многокритериальная оптимизация районного коридора: мобильность, выбросы, безопасность, доступность и локальная экономика.",
            "expected_impact": f"При внедрении: {impact_text.lower()}. Показатели получены из симуляции; после запуска нужен мониторинг фактических условий.",
        }

    impact = []
    if wait_delta > 0.5:
        impact.append(f"waiting times would decrease by {wait_delta:.1f} seconds on average")
    elif wait_delta < -0.5:
        impact.append(f"waiting times would increase by {abs(wait_delta):.1f} seconds on average")
    else:
        impact.append("waiting times would remain approximately the same")

    if speed_delta > 0.5:
        impact.append(f"traffic flow would improve by {speed_delta:.1f} km/h")
    elif speed_delta < -0.5:
        impact.append(f"traffic flow would slow by {abs(speed_delta):.1f} km/h")

    if co2_delta > 0.1:
        impact.append(f"emissions would reduce by {co2_delta:.1f} kg CO2")

    if access_delta > 2.0:
        impact.append(f"accessibility score would improve to {best_access:.0f}%")

    impact_text = "; ".join(impact) if impact else "mixed impacts across different metrics"
    signal_focus = (
        f"Signal focus: {signal_id}. This intervention targets the busiest junction in the neighborhood to reduce queue spillback and improve pedestrian crossing times."
        if signal_id
        else "Signal focus: the intervention with the strongest measured performance across neighborhood mobility, emissions, and safety."
    )
    category_rationale = {
        "signal_timing": "Precise signal timing is the foundation for reliable movement through busy intersections. This adjustment optimizes green-light access to improve throughput.",
        "traffic_management": "Managing conflict turns reduces intersection blocking and makes neighborhood flow more predictable.",
        "transit": "Prioritizing public transport makes the bus network more reliable and encourages residents to use transit instead of private vehicles.",
        "active_mobility": "Pedestrian access is central to neighborhood livability. This intervention improves crossing safety and predictability.",
        "safety": "Speed management in sensitive zones protects vulnerable road users while maintaining reasonable movement.",
        "curb_management": "Efficient curb use reduces circulating traffic searching for parking and supports local commerce.",
        "environment": "Low-emission timing cuts idling, emissions, and noise without waiting for major infrastructure works.",
    }

    return {
        "recommendation": (
            f"AI analysis unavailable; simulation-based recommendation: implement '{best_name}'. "
            f"{category_rationale.get(best_category, 'This intervention improves neighborhood conditions.')} "
            f"Expected result: {impact_text}."
        ),
        "reasoning": (
            f"The simulation compared {len(candidates)} candidate interventions against the baseline. "
            f"{best_name} was selected because it balances delay reduction, lower emissions, pedestrian access, and local commerce. "
            f"{signal_focus}"
        ),
        "tradeoffs": [
            "This recommendation is based on simulation; actual field impact should be validated through observation.",
            "The score balances several public-interest metrics rather than optimizing only one junction.",
            "Implementation, budget, and stakeholder buy-in should guide the final decision.",
        ],
        "confidence": "medium" if len(candidates) > 3 and abs(wait_delta) > 1.0 else "low",
        "signal_focus": signal_focus,
        "best_signal_id": signal_id,
        "scope": "Multi-objective neighborhood optimization balancing mobility, emissions, safety, access, and local economic vitality.",
        "expected_impact": f"If implemented, {impact_text.lower()}. These are measured from simulation; monitor actual conditions after implementation.",
    }


def _provider_available() -> bool:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    return bool(api_key)


def _provider_prompt(
    baseline: dict[str, Any],
    candidates: list[dict[str, Any]],
    best: dict[str, Any] | None,
    language: str,
) -> str:
    best_name = best.get("label", best.get("id", "best intervention")) if best else "best intervention"
    best_desc = best.get("description", "best measured intervention") if best else "best measured intervention"
    best_delta = best.get("delta", {}) if best else {}
    best_factors = best.get("factor_scores", {}) if best else {}
    signal_id = (best or {}).get("intervention", {}).get("traffic_light_id") if best else None
    baseline_wait = _as_float(baseline.get("average_waiting_seconds"))
    baseline_speed = _as_float(baseline.get("average_speed_kmh"))
    best_metrics = (best or {}).get("metrics", {})
    best_wait = _as_float(best_metrics.get("average_waiting_seconds"), baseline_wait)
    best_speed = _as_float(best_metrics.get("average_speed_kmh"), baseline_speed)
    output_language = "Russian" if language == "ru" else "English"

    return (
        "You are generating a short official mobility recommendation from simulation metrics only. "
        "Do not claim real-world impact beyond the measured simulation results. "
        f"Write all values in {output_language}. "
        "Return strict JSON only, without Markdown. "
        "Required keys: recommendation, reasoning, tradeoffs, confidence, signal_focus, best_signal_id, scope, expected_impact. "
        "tradeoffs must be an array of 2-4 short strings. "
        f"Baseline average speed: {baseline_speed} km/h. Baseline average waiting: {baseline_wait} seconds. "
        f"Candidate count: {len(candidates)}. Best measured intervention: {best_name}. Description: {best_desc}. "
        f"Best average speed: {best_speed} km/h. Best average waiting: {best_wait} seconds. "
        f"Best traffic signal id: {signal_id}. Improvement deltas: {best_delta}. "
        f"Best multi-factor optimization scores: {best_factors}."
    )


def explain_results(
    baseline: dict[str, Any],
    candidates: list[dict[str, Any]],
    best: dict[str, Any] | None = None,
    language: str = "en",
) -> dict[str, Any]:
    language = _normalize_language(language)
    fallback = _fallback_explanation(baseline, candidates, best, language=language)
    if not _provider_available():
        return fallback

    try:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("AI API key missing")

        prompt = _provider_prompt(baseline, candidates, best, language)

        try:
            import google.generativeai as genai
        except Exception:
            try:
                from google import genai as google_genai  # type: ignore
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(f"AI dependency missing: {exc}") from exc

            client = google_genai.Client(api_key=api_key)
            model_name = os.getenv("AI_MODEL", "gemini-2.0-flash")
            response = client.models.generate_content(model=model_name, contents=prompt)
            text = getattr(response, "text", "") or ""
            if not text:
                raise RuntimeError("Empty AI response")
            return _normalize_explanation(json.loads(_clean_json_response(text)), fallback)

        genai.configure(api_key=api_key)
        model_name = os.getenv("AI_MODEL", "gemini-2.0-flash")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        text = getattr(response, "text", "") or ""
        if not text:
            raise RuntimeError("Empty AI response")

        return _normalize_explanation(json.loads(_clean_json_response(text)), fallback)
    except Exception:
        return fallback


def propose_interventions(context: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Return only deterministic, valid intervention definitions within the allowed action space."""
    allowed = [
        {"type": "extend_green", "seconds": 5},
        {"type": "extend_green", "seconds": 10},
        {"type": "reduce_green", "seconds": 5},
    ]
    return allowed
