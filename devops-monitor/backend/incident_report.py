from __future__ import annotations

import asyncio
import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Any

import httpx

PROMETHEUS_URL_DEFAULT = "http://prometheus:9090"
ANTHROPIC_API_URL = os.getenv("ANTHROPIC_API_URL", "https://api.anthropic.com/v1/messages")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")


@dataclass
class MetricSeriesSummary:
    points: int
    minimum: float
    maximum: float
    average: float
    latest: float
    slope: float


def _to_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return number
    except Exception:
        return None


def _extract_values(metric_series: Any) -> list[float]:
    if not isinstance(metric_series, list):
        return []
    values: list[float] = []
    for item in metric_series:
        if isinstance(item, dict):
            raw_value = item.get("value")
            if isinstance(raw_value, (list, tuple)) and len(raw_value) >= 2:
                number = _to_float(raw_value[1])
                if number is not None:
                    values.append(number)
            elif "y" in item:
                number = _to_float(item.get("y"))
                if number is not None:
                    values.append(number)
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            number = _to_float(item[1])
            if number is not None:
                values.append(number)
        else:
            number = _to_float(item)
            if number is not None:
                values.append(number)
    return values


def _summarize_series(series: list[float]) -> MetricSeriesSummary:
    if not series:
        return MetricSeriesSummary(points=0, minimum=0.0, maximum=0.0, average=0.0, latest=0.0, slope=0.0)

    points = len(series)
    minimum = min(series)
    maximum = max(series)
    average_value = mean(series)
    latest = series[-1]

    x_values = list(range(points))
    x_mean = mean(x_values)
    y_mean = average_value
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, series))
    denominator = sum((x - x_mean) ** 2 for x in x_values) or 1.0
    slope = numerator / denominator

    return MetricSeriesSummary(
        points=points,
        minimum=minimum,
        maximum=maximum,
        average=average_value,
        latest=latest,
        slope=slope,
    )


def _build_metrics_brief(metrics_data: dict[str, Any]) -> dict[str, Any]:
    cpu_series = _extract_values(metrics_data.get("cpu", metrics_data.get("cpu_percent", [])))
    ram_series = _extract_values(metrics_data.get("ram", metrics_data.get("ram_percent", [])))
    disk_series = _extract_values(metrics_data.get("disk", metrics_data.get("disk_percent", [])))

    cpu_summary = _summarize_series(cpu_series)
    ram_summary = _summarize_series(ram_series)
    disk_summary = _summarize_series(disk_series)

    return {
        "cpu": cpu_summary,
        "ram": ram_summary,
        "disk": disk_summary,
        "window": metrics_data.get("window", "last_30m"),
    }


def _format_metrics_brief(metrics_brief: dict[str, Any]) -> str:
    def line(label: str, summary: MetricSeriesSummary) -> str:
        trend = "rising" if summary.slope > 0.05 else "falling" if summary.slope < -0.05 else "flat"
        return (
            f"{label}: points={summary.points}, min={summary.minimum:.2f}, max={summary.maximum:.2f}, "
            f"avg={summary.average:.2f}, latest={summary.latest:.2f}, trend={trend}"
        )

    return "\n".join(
        [
            f"Metrics window: {metrics_brief.get('window', 'last_30m')}",
            line("CPU", metrics_brief["cpu"]),
            line("RAM", metrics_brief["ram"]),
            line("DISK", metrics_brief["disk"]),
        ]
    )


async def _fetch_last_30m_metrics(prometheus_url: str = PROMETHEUS_URL_DEFAULT) -> dict[str, Any]:
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=30)
    step_seconds = 5 * 60

    queries = {
        "cpu": 'rate(node_cpu_seconds_total{mode!="idle"}[5m]) * 100',
        "ram": '100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)',
        "disk": '100 * (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes)',
    }

    async def query_range(query: str) -> list[dict[str, Any]]:
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
        return payload.get("data", {}).get("result", [])

    cpu, ram, disk = await asyncio.gather(
        query_range(queries["cpu"]),
        query_range(queries["ram"]),
        query_range(queries["disk"]),
    )
    return {"cpu": cpu, "ram": ram, "disk": disk, "window": "last_30m"}


async def _call_anthropic(prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 512,
        "temperature": 0.2,
        "system": "You are a senior DevOps engineer. Write concise, actionable incident reports.",
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(ANTHROPIC_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    content = data.get("content", [])
    if not content:
        raise ValueError("Anthropic returned an empty response")
    first = content[0]
    return str(first.get("text", "")).strip()


async def generate_incident_report(alert_data: dict[str, Any], metrics_data: dict[str, Any] | None = None) -> str:
    if metrics_data is None:
        metrics_data = await _fetch_last_30m_metrics()

    metrics_brief = _build_metrics_brief(metrics_data)
    report_prompt = f"""
Act as a senior DevOps engineer writing a brief incident report.

Alert details:
- Name: {alert_data.get('name', 'Unknown')}
- Severity: {alert_data.get('severity', 'unknown')}
- Description: {alert_data.get('description', 'No description provided')}
- Fired at: {alert_data.get('fired_at', 'unknown')}

Observed metrics summary from the last 30 minutes:
{_format_metrics_brief(metrics_brief)}

Write a concise incident report with exactly these sections:
1. What happened
2. Likely root cause based on the metrics pattern
3. Immediate recommended actions
4. Prevention steps

Keep the report short, specific, and practical. Do not mention that you are an AI.
""".strip()

    try:
        report = await _call_anthropic(report_prompt)
        if report:
            return report
    except Exception:
        pass

    return (
        f"Incident Report\n\n"
        f"What happened: Alert {alert_data.get('name', 'Unknown')} fired with severity {alert_data.get('severity', 'unknown')}.\n"
        f"Likely root cause: CPU, RAM, or disk usage showed an adverse trend over the last 30 minutes.\n"
        f"Immediate recommended actions: Check recent deploys, inspect pod health, and verify resource saturation.\n"
        f"Prevention steps: Tighten alerts, add capacity headroom, and review autoscaling thresholds."
    )