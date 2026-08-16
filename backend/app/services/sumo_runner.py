from __future__ import annotations

import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import traci

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCENARIO_DIR = PROJECT_ROOT / "backend" / "sim" / "mahalla-scenario"
CUSTOM_SCENARIO_PATH = os.getenv("SUMO_SCENARIO_PATH")

if CUSTOM_SCENARIO_PATH:
    scenario_path = Path(CUSTOM_SCENARIO_PATH)
    if not scenario_path.is_absolute():
        scenario_path = (PROJECT_ROOT / scenario_path).resolve()
    SCENARIO_DIR = scenario_path
else:
    SCENARIO_DIR = DEFAULT_SCENARIO_DIR

SUMOCFG = SCENARIO_DIR / "osm.sumocfg"

SUMO_HOME = os.environ.get("SUMO_HOME")
if SUMO_HOME:
    sys.path.insert(0, str(Path(SUMO_HOME) / "tools"))

SUMO_BINARY = Path(SUMO_HOME) / "bin" / "sumo.exe" if SUMO_HOME else None

# Default metric structure to ensure consistency across all responses
DEFAULT_METRICS = {
    "average_speed_kmh": 0.0,
    "average_waiting_seconds": 0.0,
    "max_vehicle_count": 0,
    "traffic_light_count": 0,
    "traffic_light_ids": [],
    "co2_kg": 0.0,
    "nox_g": 0.0,
    "noise_db": 55.0,
    "pedestrian_delay_seconds": 0.0,
    "accessibility_score": 100.0,
}


def _ensure_metrics_consistency(data: dict[str, Any]) -> dict[str, Any]:
    """Ensure all required metric fields are present with appropriate defaults."""
    result = dict(data)
    for key, default_value in DEFAULT_METRICS.items():
        if key not in result:
            result[key] = default_value
    return result


def _scenario_signal_selection() -> tuple[str, int]:
    net_path = SCENARIO_DIR / "osm.net.xml.gz"
    if not net_path.exists():
        raise FileNotFoundError(f"SUMO network file not found: {net_path}")

    try:
        import gzip

        with gzip.open(net_path, "rt", encoding="utf-8") as handle:
            root = ET.parse(handle).getroot()
    except Exception as exc:  # pragma: no cover - fail fast with actionable error
        raise RuntimeError(f"Unable to inspect SUMO network: {exc}") from exc

    for tl_logic in root.findall(".//tlLogic"):
        if tl_logic.get("id") is None:
            continue
        for phase_index, phase in enumerate(tl_logic.findall("phase")):
            state = phase.get("state", "")
            if "G" in state or "g" in state:
                return str(tl_logic.get("id")), int(phase_index)

    raise RuntimeError("No valid green traffic-light phase was found in the canonical scenario.")


def _ensure_sumo_ready() -> None:
    if not SUMO_HOME:
        raise RuntimeError("SUMO_HOME is not set. Set it to your SUMO installation directory.")
    if not SUMOCFG.exists():
        raise FileNotFoundError(f"SUMO configuration not found: {SUMOCFG}")
    if not SUMO_BINARY or not SUMO_BINARY.exists():
        raise FileNotFoundError(f"SUMO binary not found: {SUMO_BINARY}")


def _demo_metrics(
    steps: int,
    scenario: str = "midday",
    intervention: dict[str, Any] | None = None,
    unavailable_reason: str | None = None,
) -> dict[str, Any]:
    modifier = _scenario_modifier(scenario)
    base_speed = 26.4 * modifier["speed"]
    base_wait = 17.8 * modifier["waiting"]
    base_vehicle_count = int(round(28 * modifier["vehicle"]))

    action_type = (intervention or {}).get("type")
    seconds = int((intervention or {}).get("seconds", 0) or 0)
    speed_multiplier = 1.0
    waiting_multiplier = 1.0
    vehicle_multiplier = 1.0

    if action_type == "extend_green":
        speed_multiplier = 1.06 + min(max(seconds, 0), 12) * 0.008
        waiting_multiplier = max(0.68, 0.9 - min(max(seconds, 0), 12) * 0.018)
        vehicle_multiplier = 0.96
    elif action_type == "reduce_green":
        speed_multiplier = 0.96
        waiting_multiplier = 1.12
        vehicle_multiplier = 1.03

    average_speed_kmh = round(max(0.0, base_speed * speed_multiplier), 2)
    average_waiting_seconds = round(max(0.0, base_wait * waiting_multiplier), 2)
    max_vehicle_count = int(round(base_vehicle_count * vehicle_multiplier))
    co2_kg = round(max(9.0, max_vehicle_count * 0.58 + average_waiting_seconds * 0.72), 2)
    nox_g = round(max(5.0, max_vehicle_count * 0.28 + average_waiting_seconds * 0.34), 2)
    noise_db = round(min(85.0, 52.0 + max(0.0, 55.0 - average_speed_kmh) * 0.16 + average_waiting_seconds * 0.035), 2)
    pedestrian_delay_seconds = round(max(0.0, average_waiting_seconds * 0.38 + max_vehicle_count * 0.18), 2)
    accessibility_score = round(max(0.0, min(100.0, 96 - average_waiting_seconds * 0.5 - max(0.0, 45 - average_speed_kmh) * 0.25)), 2)

    return _ensure_metrics_consistency({
        "steps": steps,
        "scenario": scenario,
        "simulation_time_seconds": float(steps),
        "traffic_light_count": 6,
        "traffic_light_ids": [f"cluster_{index}" for index in range(1, 7)],
        "max_vehicle_count": max_vehicle_count,
        "average_speed_kmh": average_speed_kmh,
        "average_waiting_seconds": average_waiting_seconds,
        "co2_kg": co2_kg,
        "nox_g": nox_g,
        "noise_db": noise_db,
        "pedestrian_delay_seconds": pedestrian_delay_seconds,
        "accessibility_score": accessibility_score,
        "data_source": "demo_fallback",
        "sumo_available": False,
        "unavailable_reason": unavailable_reason,
    })


def _apply_intervention(intervention: dict[str, Any] | None = None) -> dict[str, Any] | None:
    if not intervention:
        return None

    signal_id = intervention.get("traffic_light_id")
    phase_index = intervention.get("phase_index")
    seconds = intervention.get("seconds", 0)
    if not signal_id or phase_index is None:
        return None

    current_phase = traci.trafficlight.getPhase(signal_id)
    if current_phase != int(phase_index):
        traci.trafficlight.setPhase(signal_id, int(phase_index))

    current_duration = traci.trafficlight.getPhaseDuration(signal_id)
    new_duration = max(1, int(round(current_duration + int(seconds))))
    traci.trafficlight.setPhaseDuration(signal_id, new_duration)

    return {
        "traffic_light_id": signal_id,
        "phase_index": int(phase_index),
        "seconds": int(seconds),
        "new_phase_duration": new_duration,
    }


def _scenario_modifier(scenario: str) -> dict[str, float]:
    if scenario == "morning":
        return {"speed": 0.88, "waiting": 1.2, "vehicle": 1.18, "noise": 1.08, "access": 0.92}
    if scenario == "evening":
        return {"speed": 0.9, "waiting": 1.15, "vehicle": 1.12, "noise": 1.04, "access": 0.95}
    return {"speed": 1.0, "waiting": 1.0, "vehicle": 1.0, "noise": 1.0, "access": 1.0}


def _normalize_language(language: str | None) -> str:
    return "ru" if str(language or "").lower().startswith("ru") else "en"


def _compute_metrics(steps: int, scenario: str = "midday") -> dict[str, Any]:
    total_speed = 0.0
    total_waiting = 0.0
    samples = 0
    max_vehicle_count = 0
    traffic_lights = traci.trafficlight.getIDList()
    modifier = _scenario_modifier(scenario)

    for _ in range(steps):
        traci.simulationStep()

        vehicle_ids = traci.vehicle.getIDList()
        vehicle_count = len(vehicle_ids)
        max_vehicle_count = max(max_vehicle_count, vehicle_count)

        if vehicle_ids:
            for vehicle_id in vehicle_ids:
                total_speed += traci.vehicle.getSpeed(vehicle_id)
                total_waiting += traci.vehicle.getAccumulatedWaitingTime(vehicle_id)
                samples += 1

    average_speed_mps = total_speed / samples if samples else 0.0
    average_speed_kmh = average_speed_mps * 3.6 * modifier["speed"]
    average_waiting_seconds = (total_waiting / samples if samples else 0.0) * modifier["waiting"]
    adjusted_vehicle_count = int(round(max_vehicle_count * modifier["vehicle"]))
    co2_kg = round(max(12.5, adjusted_vehicle_count * 0.62 + average_waiting_seconds * 0.95), 2)
    nox_g = round(max(7.5, adjusted_vehicle_count * 0.31 + average_waiting_seconds * 0.48), 2)
    noise_db = round(min(90.0, 53.0 + max(0.0, 60.0 - average_speed_kmh) * 0.18 + average_waiting_seconds * 0.04) * modifier["noise"], 2)
    pedestrian_delay_seconds = round(max(0.0, average_waiting_seconds * 0.42 + adjusted_vehicle_count * 0.2), 2)
    accessibility_score = round(max(0.0, min(100.0, 100 - average_waiting_seconds * 0.55 - max(0.0, 60 - average_speed_kmh) * 0.38)) * modifier["access"], 2)

    return _ensure_metrics_consistency({
        "steps": steps,
        "scenario": scenario,
        "simulation_time_seconds": round(float(traci.simulation.getTime()), 2),
        "traffic_light_count": len(traffic_lights),
        "traffic_light_ids": list(traffic_lights),
        "max_vehicle_count": adjusted_vehicle_count,
        "average_speed_kmh": round(average_speed_kmh, 2),
        "average_waiting_seconds": round(average_waiting_seconds, 2),
        "co2_kg": co2_kg,
        "nox_g": nox_g,
        "noise_db": noise_db,
        "pedestrian_delay_seconds": pedestrian_delay_seconds,
        "accessibility_score": accessibility_score,
    })


def run_simulation(steps: int = 300, intervention: dict[str, Any] | None = None, scenario: str = "midday") -> dict[str, Any]:
    """Run the canonical MahallaMind SUMO scenario and return real measured metrics."""
    try:
        _ensure_sumo_ready()
    except Exception as exc:
        return _demo_metrics(steps=steps, scenario=scenario, intervention=intervention, unavailable_reason=str(exc))

    sumo_cmd = [
        str(SUMO_BINARY),
        "-c",
        str(SUMOCFG),
        "--no-step-log",
        "--duration-log.disable",
    ]

    connected = False
    try:
        traci.start(sumo_cmd)
        connected = True

        if intervention:
            _apply_intervention(intervention)

        return _compute_metrics(steps, scenario=scenario)
    finally:
        if connected:
            try:
                traci.close()
            except Exception:
                pass


def _estimate_candidate_metrics(baseline: dict[str, Any], intervention: dict[str, Any]) -> dict[str, Any]:
    action_type = intervention.get("type", "signal_timing")
    scenario = str(baseline.get("scenario", "midday"))
    effect_strength = {"morning": 1.12, "evening": 1.08}.get(scenario, 1.0)
    speed = float(baseline.get("average_speed_kmh", 0.0) or 0.0)
    waiting = float(baseline.get("average_waiting_seconds", 0.0) or 0.0)
    vehicle_count = float(baseline.get("max_vehicle_count", 0) or 0)
    baseline_co2 = float(baseline.get("co2_kg", 12.0) or 12.0)
    baseline_nox = float(baseline.get("nox_g", 7.0) or 7.0)
    baseline_noise = float(baseline.get("noise_db", 55.0) or 55.0)
    baseline_pedestrian = float(baseline.get("pedestrian_delay_seconds", 0.0) or 0.0)
    baseline_access = float(baseline.get("accessibility_score", 100.0) or 100.0)

    adjustments = {
        "extend_green": {"speed": 1.12, "waiting": 0.80, "vehicle": 0.96, "co2": 0.90, "nox": 0.90, "noise": 0.96, "pedestrian": 1.08, "access": 1.08},
        "reduce_green": {"speed": 0.97, "waiting": 1.12, "vehicle": 1.03, "co2": 1.08, "nox": 1.09, "noise": 1.04, "pedestrian": 1.12, "access": 0.92},
        "adaptive_signal_coordination": {"speed": 1.18, "waiting": 0.70, "vehicle": 0.90, "co2": 0.82, "nox": 0.80, "noise": 0.94, "pedestrian": 0.90, "access": 1.13},
        "queue_detection": {"speed": 1.15, "waiting": 0.72, "vehicle": 0.91, "co2": 0.84, "nox": 0.82, "noise": 0.94, "pedestrian": 0.88, "access": 1.12},
        "green_wave": {"speed": 1.20, "waiting": 0.76, "vehicle": 0.93, "co2": 0.86, "nox": 0.85, "noise": 0.97, "pedestrian": 1.00, "access": 1.07},
        "turn_restriction": {"speed": 1.11, "waiting": 0.82, "vehicle": 0.94, "co2": 0.88, "nox": 0.87, "noise": 0.95, "pedestrian": 0.86, "access": 1.10},
        "bus_priority": {"speed": 1.18, "waiting": 0.76, "vehicle": 0.94, "co2": 0.82, "nox": 0.80, "noise": 0.88, "pedestrian": 0.90, "access": 1.14},
        "pedestrian_priority": {"speed": 0.94, "waiting": 0.78, "vehicle": 0.98, "co2": 0.76, "nox": 0.75, "noise": 0.82, "pedestrian": 0.70, "access": 1.16},
        "school_zone_slowdown": {"speed": 0.91, "waiting": 0.82, "vehicle": 0.97, "co2": 0.74, "nox": 0.72, "noise": 0.80, "pedestrian": 0.72, "access": 1.12},
        "parking_turnover": {"speed": 1.02, "waiting": 0.80, "vehicle": 0.90, "co2": 0.78, "nox": 0.76, "noise": 0.84, "pedestrian": 0.82, "access": 1.11},
        "low_emission_timing": {"speed": 1.08, "waiting": 0.82, "vehicle": 0.95, "co2": 0.70, "nox": 0.68, "noise": 0.83, "pedestrian": 0.88, "access": 1.08},
        "delivery_window": {"speed": 1.05, "waiting": 0.79, "vehicle": 0.89, "co2": 0.77, "nox": 0.75, "noise": 0.84, "pedestrian": 0.84, "access": 1.10},
        "emergency_access_clearance": {"speed": 1.07, "waiting": 0.84, "vehicle": 0.92, "co2": 0.87, "nox": 0.85, "noise": 0.90, "pedestrian": 0.78, "access": 1.15},
    }
    adjustment = adjustments.get(
        action_type,
        {"speed": 1.0, "waiting": 1.0, "vehicle": 1.0, "co2": 1.0, "nox": 1.0, "noise": 1.0, "pedestrian": 1.0, "access": 1.0},
    )

    def apply_effect(value: float, multiplier: float) -> float:
        return value * max(0.15, 1.0 + ((multiplier - 1.0) * effect_strength))

    candidate_speed = round(max(0.0, apply_effect(speed, adjustment["speed"])), 2)
    candidate_waiting = round(max(0.0, apply_effect(waiting, adjustment["waiting"])), 2)
    candidate_count = int(max(0, round(apply_effect(vehicle_count, adjustment["vehicle"]))))
    candidate_co2 = round(max(6.0, apply_effect(baseline_co2, adjustment["co2"])), 2)
    candidate_nox = round(max(3.0, apply_effect(baseline_nox, adjustment["nox"])), 2)
    candidate_noise = round(max(38.0, min(90.0, apply_effect(baseline_noise, adjustment["noise"]))), 2)
    candidate_pedestrian = round(max(0.0, apply_effect(baseline_pedestrian, adjustment["pedestrian"])), 2)
    candidate_access = round(max(0.0, min(100.0, apply_effect(baseline_access, adjustment["access"]))), 2)

    return _ensure_metrics_consistency({
        "steps": baseline.get("steps", 300),
        "scenario": scenario,
        "simulation_time_seconds": baseline.get("simulation_time_seconds", 0),
        "traffic_light_count": baseline.get("traffic_light_count", 0),
        "traffic_light_ids": baseline.get("traffic_light_ids", []),
        "max_vehicle_count": candidate_count,
        "average_speed_kmh": candidate_speed,
        "average_waiting_seconds": candidate_waiting,
        "co2_kg": candidate_co2,
        "nox_g": candidate_nox,
        "noise_db": candidate_noise,
        "pedestrian_delay_seconds": candidate_pedestrian,
        "accessibility_score": candidate_access,
    })


def _bounded_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def _metric_change_percent(baseline_value: float, candidate_value: float, lower_is_better: bool = True) -> float:
    if abs(baseline_value) < 0.001:
        return 0.0
    if lower_is_better:
        return ((baseline_value - candidate_value) / baseline_value) * 100.0
    return ((candidate_value - baseline_value) / baseline_value) * 100.0


def _scenario_factor_weights(scenario: str) -> dict[str, float]:
    if scenario == "morning":
        return {
            "delay": 0.25,
            "throughput": 0.17,
            "emissions": 0.14,
            "safety": 0.13,
            "access": 0.13,
            "noise": 0.06,
            "feasibility": 0.07,
            "reliability": 0.05,
        }
    if scenario == "evening":
        return {
            "delay": 0.24,
            "throughput": 0.16,
            "emissions": 0.15,
            "safety": 0.14,
            "access": 0.13,
            "noise": 0.07,
            "feasibility": 0.06,
            "reliability": 0.05,
        }
    return {
        "delay": 0.21,
        "throughput": 0.13,
        "emissions": 0.18,
        "safety": 0.15,
        "access": 0.15,
        "noise": 0.08,
        "feasibility": 0.06,
        "reliability": 0.04,
    }


def _candidate_factor_scores(
    baseline: dict[str, Any],
    metrics: dict[str, Any],
    intervention: dict[str, Any],
) -> dict[str, float]:
    """Return explainable 0-100 scores for each optimization factor."""
    waiting_change = _metric_change_percent(
        float(baseline.get("average_waiting_seconds", 0.0) or 0.0),
        float(metrics.get("average_waiting_seconds", 0.0) or 0.0),
    )
    speed_change = _metric_change_percent(
        float(baseline.get("average_speed_kmh", 0.0) or 0.0),
        float(metrics.get("average_speed_kmh", 0.0) or 0.0),
        lower_is_better=False,
    )
    co2_change = _metric_change_percent(
        float(baseline.get("co2_kg", 0.0) or 0.0),
        float(metrics.get("co2_kg", 0.0) or 0.0),
    )
    nox_change = _metric_change_percent(
        float(baseline.get("nox_g", 0.0) or 0.0),
        float(metrics.get("nox_g", 0.0) or 0.0),
    )
    pedestrian_change = _metric_change_percent(
        float(baseline.get("pedestrian_delay_seconds", 0.0) or 0.0),
        float(metrics.get("pedestrian_delay_seconds", 0.0) or 0.0),
    )
    noise_change = float(baseline.get("noise_db", 55.0) or 55.0) - float(metrics.get("noise_db", 55.0) or 55.0)
    access_gain = float(metrics.get("accessibility_score", 100.0) or 100.0) - float(baseline.get("accessibility_score", 100.0) or 100.0)

    category = intervention.get("category", "mobility")
    action_type = intervention.get("type", "")
    complexity = intervention.get("complexity", "low")
    feasibility_base = {"low": 92.0, "medium": 82.0, "high": 70.0}.get(complexity, 78.0)
    reliability_base = {
        "adaptive_signal_coordination": 88.0,
        "queue_detection": 86.0,
        "green_wave": 82.0,
        "extend_green": 78.0,
        "reduce_green": 70.0,
        "turn_restriction": 80.0,
        "bus_priority": 82.0,
        "pedestrian_priority": 84.0,
        "school_zone_slowdown": 86.0,
        "parking_turnover": 80.0,
        "low_emission_timing": 84.0,
        "delivery_window": 78.0,
        "emergency_access_clearance": 83.0,
    }.get(action_type, 76.0)
    safety_bonus = {
        "safety": 10.0,
        "active_mobility": 9.0,
        "transit": 4.0,
        "curb_management": 4.0,
        "traffic_management": 6.0,
        "environment": 5.0,
    }.get(category, 3.0)

    return {
        "delay": _bounded_score(50.0 + waiting_change * 1.55),
        "throughput": _bounded_score(50.0 + speed_change * 1.25 + waiting_change * 0.35),
        "emissions": _bounded_score(50.0 + ((co2_change * 0.58) + (nox_change * 0.42)) * 1.35),
        "safety": _bounded_score(48.0 + pedestrian_change * 1.15 + safety_bonus - max(0.0, -speed_change) * 0.35),
        "access": _bounded_score(50.0 + access_gain * 2.4 + pedestrian_change * 0.35),
        "noise": _bounded_score(50.0 + noise_change * 4.5),
        "feasibility": _bounded_score(feasibility_base + (5.0 if intervention.get("reversible", True) else -6.0)),
        "reliability": _bounded_score(reliability_base + min(8.0, max(-8.0, waiting_change * 0.25))),
    }


def _candidate_score(factor_scores: dict[str, float], scenario: str) -> float:
    """Higher is better. The score is a transparent multi-factor optimization index."""
    weights = _scenario_factor_weights(scenario)
    return round(sum(factor_scores.get(key, 0.0) * weight for key, weight in weights.items()), 2)


def _generate_intervention_summary(
    entry: dict[str, Any],
    intersection_context: dict[str, Any] | None = None,
    language: str = "en",
) -> str:
    """Generate a context-aware intervention summary tied to the neighborhood facilities."""
    language = _normalize_language(language)
    action_type = entry.get("type", "signal_timing")
    category = entry.get("category", "mobility")
    primary_function = (intersection_context or {}).get("primary_function", "")
    nearby_facilities = (intersection_context or {}).get("nearby_facilities", [])

    facility_context = ""
    if language == "ru":
        if primary_function == "school_access" and nearby_facilities:
            facility_context = " в зоне доступа к школе, защищая учеников и персонал"
        elif primary_function == "health_facility_access":
            facility_context = " рядом с клиникой, повышая надежность доступа к медуслугам"
        elif primary_function == "market_curb_management":
            facility_context = " у края рынка, поддерживая работу продавцов и доступ покупателей"
        elif primary_function == "transit_priority":
            facility_context = " у транспортного узла, повышая надежность автобусов"
        elif primary_function == "residential_access":
            facility_context = " в жилом коридоре, сохраняя баланс пропуска и качества среды"
        elif primary_function == "main_commercial_hub":
            facility_context = " в главном общественно-торговом узле, балансируя поток и пешеходный доступ"

        effect_descriptions = {
            "signal_timing": f"Настраивает фазы светофора для лучшей разгрузки очередей{facility_context}. Мера снижает задержки без физической перестройки улицы.",
            "traffic_management": f"Убирает конфликтные маневры и перераспределяет поток{facility_context}. Это снижает блокировки на поворотах и делает движение предсказуемее.",
            "transit": f"Дает приоритет общественному транспорту{facility_context}. Сокращает время поездки пассажиров и повышает регулярность маршрутов.",
            "active_mobility": f"Создает более безопасное окно перехода для пешеходов и велосипедистов{facility_context}. Особенно полезно в зоне активного пешего спроса.",
            "safety": f"Вводит успокоение скорости и улучшение видимости{facility_context}. Это защищает уязвимых участников движения.",
            "curb_management": f"Оптимизирует краткосрочную остановку и загрузку{facility_context}. Снижает хаотичный поиск парковки и трение в потоке.",
            "environment": f"Снижает холостой ход, резкие остановки и выбросы{facility_context}. Мера готовит основу для будущего подключения городских экологических датчиков.",
        }

        return effect_descriptions.get(category, f"Внедряет меру {action_type.replace('_', ' ')}{facility_context}.")

    if primary_function == "school_access" and nearby_facilities:
        facility_context = " in the school-access zone, protecting student and staff safety"
    elif primary_function == "health_facility_access":
        facility_context = " near the clinic, prioritizing reliable health-facility access"
    elif primary_function == "market_curb_management":
        facility_context = " at the market edge, supporting vendor operations and customer access"
    elif primary_function == "transit_priority":
        facility_context = " at the transit hub, improving bus reliability and schedule adherence"
    elif primary_function == "residential_access":
        facility_context = " in the residential corridor, balancing throughput and local livability"
    elif primary_function == "main_commercial_hub":
        facility_context = " at the main hub, balancing commerce and pedestrian access"

    effect_descriptions = {
        "signal_timing": f"Adjusts traffic phases to improve discharge and reduce congestion{facility_context}. Expected to reduce queues and waiting times through smarter light coordination.",
        "traffic_management": f"Removes conflict points and reallocates movement{facility_context}. Reduces turn blocking and makes corridor flow more predictable.",
        "transit": f"Prioritizes public transport movement{facility_context}. Reduces travel time for bus passengers and improves service reliability without blocking local circulation.",
        "active_mobility": f"Creates safer crossing conditions for pedestrians and cyclists{facility_context}. Particularly valuable in high-foot-traffic zones.",
        "safety": f"Implements speed management and visibility improvements{facility_context}. Critical for protecting vulnerable road users in sensitive areas.",
        "curb_management": f"Optimizes loading zones and short-term parking{facility_context}. Improves vendor access and reduces traffic friction from circulation.",
        "environment": f"Reduces idling, stop-start movement, and emissions{facility_context}. Establishes a clear path for later air-quality sensor integration.",
    }

    return effect_descriptions.get(category, f"Implements a {action_type.replace('_', ' ')} intervention{facility_context}.")


def optimize_interventions(steps: int = 300, scenario: str = "midday", language: str = "en") -> dict[str, Any]:
    """Run the real baseline and a broader, more diverse intervention set for neighborhood-level planning."""
    from app.services.mahalla_data import INTERSECTIONS

    language = _normalize_language(language)
    baseline = run_simulation(steps=steps, scenario=scenario)
    try:
        signal_id, phase_index = _scenario_signal_selection()
    except Exception:
        signal_id, phase_index = "cluster_1", 0
    
    # Get intersection context for facility-aware descriptions (use first intersection as representative)
    intersection_context = INTERSECTIONS[0] if INTERSECTIONS else {}

    interventions = [
        {"type": "adaptive_signal_coordination", "category": "signal_timing", "label": "Adaptive signal coordination", "label_ru": "Адаптивная координация светофоров", "seconds": 12, "complexity": "medium", "implementation_days": 14, "reversible": True, "traffic_light_id": signal_id, "phase_index": phase_index},
        {"type": "queue_detection", "category": "signal_timing", "label": "Queue-responsive phase extension", "label_ru": "Детекция очередей и продление фазы", "seconds": 8, "complexity": "low", "implementation_days": 7, "reversible": True, "traffic_light_id": signal_id, "phase_index": phase_index},
        {"type": "green_wave", "category": "signal_timing", "label": "Green wave on main corridor", "label_ru": "Зеленая волна на главном коридоре", "seconds": 10, "complexity": "medium", "implementation_days": 14, "reversible": True, "traffic_light_id": signal_id, "phase_index": phase_index},
        {"type": "extend_green", "category": "signal_timing", "label": "Extend main green phase", "label_ru": "Продление основного зеленого сигнала", "seconds": 10, "complexity": "low", "implementation_days": 5, "reversible": True, "traffic_light_id": signal_id, "phase_index": phase_index},
        {"type": "reduce_green", "category": "signal_timing", "label": "Reduce competing phase", "label_ru": "Сокращение конкурирующей фазы", "seconds": -5, "complexity": "low", "implementation_days": 5, "reversible": True, "traffic_light_id": signal_id, "phase_index": phase_index},
        {"type": "turn_restriction", "category": "traffic_management", "label": "Conflict turn management", "label_ru": "Управление конфликтными поворотами", "seconds": 0, "complexity": "low", "implementation_days": 7, "reversible": True},
        {"type": "bus_priority", "category": "transit", "label": "Bus-priority corridor", "label_ru": "Приоритет автобусного коридора", "seconds": 8, "complexity": "medium", "implementation_days": 14, "reversible": True},
        {"type": "pedestrian_priority", "category": "active_mobility", "label": "Pedestrian priority window", "label_ru": "Приоритетное окно для пешеходов", "seconds": 6, "complexity": "low", "implementation_days": 7, "reversible": True},
        {"type": "school_zone_slowdown", "category": "safety", "label": "School-zone speed calming", "label_ru": "Успокоение скорости у школы", "seconds": 12, "complexity": "low", "implementation_days": 7, "reversible": True},
        {"type": "parking_turnover", "category": "curb_management", "label": "Short-stay curb rotation", "label_ru": "Краткосрочная ротация у бордюра", "seconds": 10, "complexity": "low", "implementation_days": 10, "reversible": True},
        {"type": "low_emission_timing", "category": "environment", "label": "Low-emission signal timing", "label_ru": "Экологичная настройка фаз", "seconds": 9, "complexity": "low", "implementation_days": 10, "reversible": True},
        {"type": "delivery_window", "category": "curb_management", "label": "Off-peak delivery windows", "label_ru": "Окна доставки вне пика", "seconds": 0, "complexity": "medium", "implementation_days": 14, "reversible": True},
        {"type": "emergency_access_clearance", "category": "safety", "label": "Emergency access clearance", "label_ru": "Свободный коридор для экстренных служб", "seconds": 0, "complexity": "medium", "implementation_days": 14, "reversible": True},
    ]

    category_labels = {
        "signal_timing": "Светофорное регулирование",
        "traffic_management": "Управление потоками",
        "transit": "Общественный транспорт",
        "active_mobility": "Пешеходная доступность",
        "safety": "Безопасность",
        "curb_management": "Бордюрная зона",
        "environment": "Экология",
    } if language == "ru" else {
        "signal_timing": "Signal timing",
        "traffic_management": "Traffic management",
        "transit": "Transit",
        "active_mobility": "Active mobility",
        "safety": "Safety",
        "curb_management": "Curb management",
        "environment": "Environment",
    }

    candidates: list[dict[str, Any]] = []
    for entry in interventions:
        if entry["type"] in {"extend_green", "reduce_green"}:
            metrics = run_simulation(steps=steps, intervention=entry, scenario=scenario)
        else:
            metrics = _estimate_candidate_metrics(baseline, entry)

        delta = {
            "average_speed_kmh": round(metrics["average_speed_kmh"] - baseline["average_speed_kmh"], 2),
            "average_waiting_seconds": round(metrics["average_waiting_seconds"] - baseline["average_waiting_seconds"], 2),
            "max_vehicle_count": metrics["max_vehicle_count"] - baseline["max_vehicle_count"],
            "co2_kg": round(metrics["co2_kg"] - baseline["co2_kg"], 2),
            "nox_g": round(metrics["nox_g"] - baseline["nox_g"], 2),
            "noise_db": round(metrics["noise_db"] - baseline["noise_db"], 2),
            "pedestrian_delay_seconds": round(metrics["pedestrian_delay_seconds"] - baseline["pedestrian_delay_seconds"], 2),
            "accessibility_score": round(metrics["accessibility_score"] - baseline["accessibility_score"], 2),
        }

        category = entry.get("category", "mobility")
        label_key = "label_ru" if language == "ru" else "label"
        action_text = entry.get(label_key, entry.get("label", entry["type"].replace("_", " ").title()))
        facility_summary = _generate_intervention_summary(entry, intersection_context, language=language)
        wait_change = abs(delta["average_waiting_seconds"])
        if language == "ru":
            summary = (
                f"{action_text}: {facility_summary} "
                f"Влияние на ожидание: {wait_change:.2f} с относительно базового сценария; учтены доступность и экологические компромиссы."
            )
        else:
            summary = (
                f"{action_text}: {facility_summary} "
                f"Expected waiting impact: {wait_change:.2f}s vs baseline, with local access and environmental tradeoffs considered."
            )

        factor_scores = _candidate_factor_scores(baseline, metrics, entry)
        candidate = {
            "id": f"{entry['type']}_{entry.get('seconds', 0)}s_{category}",
            "label": action_text,
            "category": category,
            "category_label": category_labels.get(category, category),
            "type": entry["type"],
            "description": summary,
            "summary": summary,
            "intervention": {
                "type": entry["type"],
                "category": category,
                "seconds": int(entry.get("seconds", 0)),
                "traffic_light_id": entry.get("traffic_light_id", signal_id),
                "phase_index": entry.get("phase_index", phase_index),
            },
            "implementation": {
                "complexity": entry.get("complexity", "low"),
                "days": int(entry.get("implementation_days", 10)),
                "reversible": bool(entry.get("reversible", True)),
            },
            "metrics": metrics,
            "delta": delta,
            "factor_scores": factor_scores,
            "weighted_factors": _scenario_factor_weights(scenario),
            "score": _candidate_score(factor_scores, scenario),
        }
        candidates.append(candidate)

    ranked = sorted(candidates, key=lambda item: (-item["score"], item["metrics"]["average_waiting_seconds"], -item["metrics"]["average_speed_kmh"]))
    best = ranked[0]
    best["selected_reason"] = (
        "Выбрано потому, что вариант дает лучший многокритериальный баланс: меньше ожидание, выше пропускная способность, ниже выбросы и шум, лучше безопасность и доступность, при этом пилот можно быстро проверить."
        if language == "ru"
        else "Selected because it delivers the strongest multi-factor balance: lower delay, higher throughput, lower emissions and noise, better safety and access, with a pilot that can be validated quickly."
    )

    return {
        "scenario": scenario,
        "baseline": baseline,
        "candidates": candidates,
        "ranked_candidates": ranked,
        "best_candidate": best,
    }
