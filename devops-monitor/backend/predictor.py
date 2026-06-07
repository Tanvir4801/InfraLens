from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pandas as pd

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    Prophet = None  # type: ignore
    PROPHET_AVAILABLE = False

PROMETHEUS_DEFAULT_URL = "http://prometheus:9090"
CPU_QUERY = 'rate(node_cpu_seconds_total{mode!="idle"}[5m]) * 100'


@dataclass
class PredictionResult:
    will_overload: bool
    predicted_max_cpu: float
    minutes_until_overload: int
    confidence: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "will_overload": self.will_overload,
            "predicted_max_cpu": round(float(self.predicted_max_cpu), 1),
            "minutes_until_overload": int(self.minutes_until_overload),
            "confidence": round(float(self.confidence), 2),
        }


async def _prometheus_query_range(
    prometheus_url: str,
    query: str,
    start: datetime,
    end: datetime,
    step_seconds: int,
) -> dict[str, Any]:
    params = {
        "query": query,
        "start": start.astimezone(timezone.utc).timestamp(),
        "end": end.astimezone(timezone.utc).timestamp(),
        "step": step_seconds,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{prometheus_url}/api/v1/query_range", params=params)
        response.raise_for_status()
        payload = response.json()
    if payload.get("status") != "success":
        raise ValueError(f"Prometheus query failed: {payload!r}")
    return payload


def _coerce_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return number
    except Exception:
        return None


def _aggregate_matrix_result(values: list[list[Any]]) -> dict[float, list[float]]:
    buckets: dict[float, list[float]] = {}
    for item in values:
        for ts_text, value_text in item:
            ts = _coerce_float(ts_text)
            value = _coerce_float(value_text)
            if ts is None or value is None:
                continue
            buckets.setdefault(ts, []).append(value)
    return buckets


def _build_dataframe_from_series(results: list[dict[str, Any]]) -> pd.DataFrame:
    buckets = _aggregate_matrix_result([result.get("values", []) for result in results])
    rows: list[dict[str, Any]] = []
    for timestamp, values in sorted(buckets.items()):
        if not values:
            continue
        rows.append(
            {
                "ds": datetime.fromtimestamp(timestamp, tz=timezone.utc),
                "y": float(sum(values) / len(values)),
            }
        )
    frame = pd.DataFrame(rows, columns=["ds", "y"])
    if frame.empty:
        raise ValueError("No CPU data points were returned from Prometheus")
    frame = frame.dropna().sort_values("ds").reset_index(drop=True)
    return frame


async def fetch_cpu_history(
    prometheus_url: str = PROMETHEUS_DEFAULT_URL,
    query: str = CPU_QUERY,
    hours: int = 2,
    points: int = 100,
) -> pd.DataFrame:
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)
    step_seconds = max(1, int((hours * 3600) / max(points - 1, 1)))
    payload = await _prometheus_query_range(prometheus_url, query, start, end, step_seconds)
    results = payload.get("data", {}).get("result", [])
    frame = _build_dataframe_from_series(results)
    if len(frame) > points:
        frame = frame.iloc[:points].copy()
    return frame


def train_prophet_model(frame: pd.DataFrame) -> "Prophet | None":
    if frame.empty:
        raise ValueError("Training data frame is empty")
    prophet_frame = frame.rename(columns={"ds": "ds", "y": "y"})[["ds", "y"]].copy()
    prophet_frame["ds"] = pd.to_datetime(prophet_frame["ds"], utc=True).dt.tz_convert(None)
    if not PROPHET_AVAILABLE:
        return None
    try:
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=False,
            yearly_seasonality=False,
            interval_width=0.85,
            stan_backend="CMDSTANPY",
        )
        model.fit(prophet_frame)
        return model
    except Exception:
        return None


def _predict_with_trend(
    frame: pd.DataFrame,
    future_points: int,
    step_minutes: int,
    overload_threshold: float,
) -> PredictionResult:
    ordered = frame.sort_values("ds").reset_index(drop=True)
    if len(ordered) < 2:
        latest = float(ordered["y"].iloc[-1]) if not ordered.empty else 0.0
        return PredictionResult(
            will_overload=latest > overload_threshold,
            predicted_max_cpu=latest,
            minutes_until_overload=0 if latest <= overload_threshold else step_minutes,
            confidence=0.5,
        )

    x_values = list(range(len(ordered)))
    y_values = [float(value) for value in ordered["y"].tolist()]
    x_mean = sum(x_values) / len(x_values)
    y_mean = sum(y_values) / len(y_values)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
    denominator = sum((x - x_mean) ** 2 for x in x_values) or 1.0
    slope = numerator / denominator
    intercept = y_mean - slope * x_mean

    projected_values: list[float] = []
    for step_index in range(1, future_points + 1):
        projected_index = len(ordered) + step_index - 1
        projected_values.append(intercept + slope * projected_index)

    predicted_max_cpu = max(projected_values)
    overload_offsets = [index for index, value in enumerate(projected_values, start=1) if value > overload_threshold]

    if overload_offsets:
        first_offset = overload_offsets[0]
        minutes_until_overload = first_offset * step_minutes
        will_overload = True
        confidence = min(0.99, max(0.5, 0.5 + min((predicted_max_cpu - overload_threshold) / 100.0, 0.49)))
    else:
        minutes_until_overload = 0
        will_overload = False
        confidence = max(0.05, min(0.99, 1.0 - (overload_threshold - predicted_max_cpu) / max(overload_threshold, 1.0)))

    return PredictionResult(
        will_overload=will_overload,
        predicted_max_cpu=predicted_max_cpu,
        minutes_until_overload=minutes_until_overload,
        confidence=confidence,
    )


def predict_cpu_overload(
    frame: pd.DataFrame,
    model: Prophet,
    future_points: int = 6,
    step_minutes: int = 5,
    overload_threshold: float = 85.0,
) -> PredictionResult:
    if future_points <= 0:
        raise ValueError("future_points must be positive")
    future = model.make_future_dataframe(periods=future_points, freq=f"{step_minutes}min", include_history=True)
    forecast = model.predict(future)
    predicted = forecast.tail(future_points).copy()

    if predicted.empty:
        raise ValueError("No forecast rows were produced")

    yhat_max = float(predicted["yhat"].max())
    overload_rows = predicted[predicted["yhat"] > overload_threshold]

    if overload_rows.empty:
        confidence = 1.0 - float(max(0.0, overload_threshold - yhat_max) / max(overload_threshold, 1.0))
        confidence = max(0.05, min(0.99, confidence))
        minutes_until_overload = 0
        will_overload = False
    else:
        first_overload_row = overload_rows.iloc[0]
        first_overload_time = pd.Timestamp(first_overload_row["ds"])
        last_history_time = pd.Timestamp(frame["ds"].max())
        delta_minutes = int(max(0.0, (first_overload_time - last_history_time).total_seconds() / 60.0))
        confidence = float(first_overload_row.get("yhat_upper", first_overload_row["yhat"]) - overload_threshold)
        confidence = max(0.5, min(0.99, 0.5 + min(confidence / max(overload_threshold, 1.0), 0.49)))
        minutes_until_overload = delta_minutes
        will_overload = True

    return PredictionResult(
        will_overload=will_overload,
        predicted_max_cpu=yhat_max,
        minutes_until_overload=minutes_until_overload,
        confidence=confidence,
    )


async def generate_prediction(
    prometheus_url: str = PROMETHEUS_DEFAULT_URL,
    query: str = CPU_QUERY,
    hours: int = 2,
    points: int = 100,
    future_points: int = 6,
    step_minutes: int = 5,
    overload_threshold: float = 85.0,
) -> dict[str, Any]:
    frame = await fetch_cpu_history(
        prometheus_url=prometheus_url,
        query=query,
        hours=hours,
        points=points,
    )
    model = train_prophet_model(frame)
    if model is None:
        result = _predict_with_trend(
            frame=frame,
            future_points=future_points,
            step_minutes=step_minutes,
            overload_threshold=overload_threshold,
        )
    else:
        result = predict_cpu_overload(
            frame=frame,
            model=model,
            future_points=future_points,
            step_minutes=step_minutes,
            overload_threshold=overload_threshold,
        )
    return result.to_dict()
