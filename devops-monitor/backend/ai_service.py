from __future__ import annotations

import asyncio
import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY",   "")

# ---------------------------------------------------------------------------
# Fallback rule-based responses (no API needed)
# ---------------------------------------------------------------------------

def fallback_report(alert_name: str, cpu: float = 0, ram: float = 0) -> str:
    if cpu > 85:
        return (
            f"## What Happened\n"
            f"Alert '{alert_name}' fired. CPU is critically high at {cpu:.1f}%.\n\n"
            f"## Root Cause Analysis\n"
            f"Likely caused by a runaway process or traffic spike.\n\n"
            f"## Immediate Actions Required\n"
            f"Run `top` or `htop` to identify the offending process. "
            f"Consider scaling the service horizontally or restarting the high-CPU process.\n\n"
            f"## Prevention Steps\n"
            f"Add autoscaling rules at 70% CPU threshold. Review deployment for resource-intensive changes."
        )
    if ram > 85:
        return (
            f"## What Happened\n"
            f"Alert '{alert_name}' fired. RAM usage is at {ram:.1f}%.\n\n"
            f"## Root Cause Analysis\n"
            f"Possible memory leak or under-provisioned service.\n\n"
            f"## Immediate Actions Required\n"
            f"Run `free -h` and `ps aux --sort=-%mem` to identify memory consumers. "
            f"Restart the top memory-consuming service.\n\n"
            f"## Prevention Steps\n"
            f"Enable memory alerting at 75%. Add heap profiling to your services."
        )
    return (
        f"## What Happened\n"
        f"Alert '{alert_name}' fired.\n\n"
        f"## Root Cause Analysis\n"
        f"Review recent deployments and infrastructure changes.\n\n"
        f"## Immediate Actions Required\n"
        f"Check logs with `journalctl -xe`. Monitor metrics for the next 10 minutes.\n\n"
        f"## Prevention Steps\n"
        f"Tighten alert thresholds and add predictive alerting."
    )


def fallback_chat(question: str, cpu: float, ram: float, disk: float, alerts: list[str]) -> str:
    q = question.lower()
    if "cpu" in q:
        return (
            f"CPU is currently at {cpu:.1f}%. "
            + ("This is elevated — check for runaway processes with `top`." if cpu > 70
               else "This is within normal range.")
        )
    if "memory" in q or "ram" in q:
        return (
            f"RAM usage is {ram:.1f}%. "
            + ("Memory pressure detected — check with `free -h`." if ram > 70
               else "Memory looks healthy.")
        )
    if "disk" in q or "storage" in q:
        return (
            f"Disk usage is {disk:.1f}%. "
            + ("Getting full — run `df -h` and clean up logs." if disk > 75
               else "Disk space is fine.")
        )
    if "alert" in q:
        if alerts:
            return f"Active alerts: {', '.join(alerts)}. Prioritise critical severity first."
        return "No active alerts — system looks stable!"
    return (
        f"System status: CPU {cpu:.1f}%, RAM {ram:.1f}%, Disk {disk:.1f}%. "
        f"{'⚠ ' + str(len(alerts)) + ' active alert(s).' if alerts else 'No active alerts.'}"
    )


def fallback_anomaly(metric_name: str, value: float, threshold: float, trend: str) -> str:
    direction = "rising" if trend == "up" else "falling"
    return f"{metric_name} at {value:.1f}% ({direction}), exceeds {threshold:.0f}% threshold."


# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------

def _build_gemini_model() -> Any | None:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_API_KEY)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return None


def _build_groq_client() -> Any | None:
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq  # type: ignore
        return Groq(api_key=GROQ_API_KEY)
    except Exception:
        return None


async def _gemini_generate(prompt: str) -> str:
    model = await asyncio.to_thread(_build_gemini_model)
    if model is None:
        raise RuntimeError("Gemini model unavailable")
    response = await asyncio.to_thread(model.generate_content, prompt)
    return response.text


async def _groq_generate(prompt: str) -> str:
    client = await asyncio.to_thread(_build_groq_client)
    if client is None:
        raise RuntimeError("Groq client unavailable")

    def _call() -> str:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
            temperature=0.3,
        )
        return completion.choices[0].message.content or ""

    return await asyncio.to_thread(_call)


async def _generate_with_fallback(prompt: str, rule_fallback: str) -> tuple[str, str]:
    """Try Gemini → Groq → rule-based. Returns (text, model_used)."""
    try:
        text = await _gemini_generate(prompt)
        return text, "gemini-2.0-flash"
    except Exception:
        pass
    try:
        text = await _groq_generate(prompt)
        return text, "llama-3.1-8b-instant"
    except Exception:
        pass
    return rule_fallback, "rule-based"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_incident_report(
    alert_name: str,
    severity: str,
    description: str,
    cpu_history: list[Any],
    ram_history: list[Any],
) -> tuple[str, str]:
    cpu_avg = sum(float(v) for v in cpu_history) / len(cpu_history) if cpu_history else 0
    ram_avg = sum(float(v) for v in ram_history) / len(ram_history) if ram_history else 0

    prompt = f"""You are a senior DevOps engineer writing an incident report.

ALERT: {alert_name}
SEVERITY: {severity}
DESCRIPTION: {description}
CPU last 30min (avg {cpu_avg:.1f}%): {cpu_history}
RAM last 30min (avg {ram_avg:.1f}%): {ram_history}

Write a structured incident report with these sections:
## What Happened
## Root Cause Analysis
## Immediate Actions Required
## Prevention Steps

Be concise, technical, and actionable. Max 250 words."""

    return await _generate_with_fallback(
        prompt,
        fallback_report(alert_name, cpu_avg, ram_avg),
    )


async def ai_chat_response(
    question: str,
    cpu: float,
    ram: float,
    disk: float,
    active_alerts: list[str],
) -> tuple[str, str]:
    alerts_str = ", ".join(active_alerts) if active_alerts else "none"
    prompt = f"""You are InfraLens AI, a DevOps monitoring assistant.

Current server state:
- CPU: {cpu:.1f}%
- RAM: {ram:.1f}%
- Disk: {disk:.1f}%
- Active alerts: {alerts_str}

User question: {question}

Answer in 2-3 sentences maximum. Be technical and precise."""

    return await _generate_with_fallback(
        prompt,
        fallback_chat(question, cpu, ram, disk, active_alerts),
    )


async def generate_anomaly_summary(
    metric_name: str,
    value: float,
    threshold: float,
    trend: str,
) -> tuple[str, str]:
    prompt = f"""In one sentence, explain this server anomaly for a DevOps dashboard:
Metric: {metric_name}, Current value: {value}%, Threshold: {threshold}%, Trend: {trend}
Response must be under 15 words."""

    return await _generate_with_fallback(
        prompt,
        fallback_anomaly(metric_name, value, threshold, trend),
    )
