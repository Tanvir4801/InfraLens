import asyncio
import contextlib
import os
import random
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import httpx
import psutil
from dotenv import load_dotenv
from fastapi import Body, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from starlette.responses import Response

from ai_service import ai_chat_response, generate_incident_report as ai_incident_report
from predictor import generate_prediction

load_dotenv()

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
ALERTMANAGER_URL = os.getenv("ALERTMANAGER_URL", "http://alertmanager:9093")
METRICS_REFRESH_SECONDS = float(os.getenv("METRICS_REFRESH_SECONDS", "3"))

request_counter = Counter(
    "backend_http_requests_total",
    "Total HTTP requests handled by the backend",
    ["path", "method"],
)

live_clients_gauge = Gauge("backend_ws_connected_clients", "Connected live WebSocket clients")

# In-memory rolling history for sparklines (max 60 points per server)
_server_history: dict[str, list[dict[str, Any]]] = {}
_HISTORY_MAX = 60
_START_TIME = time.time()


def _simulated_servers() -> list[dict[str, Any]]:
    """Return simulated server metrics using psutil as base + seeded variation."""
    try:
        real_cpu = psutil.cpu_percent(interval=0)
        real_ram = psutil.virtual_memory().percent
        real_disk = psutil.disk_usage("/").percent
    except Exception:
        real_cpu, real_ram, real_disk = 20.0, 50.0, 40.0

    def jitter(base: float, seed: int, spread: float = 15.0) -> float:
        r = random.Random(seed + int(time.time() / 5))
        return round(min(99.0, max(1.0, base + r.uniform(-spread, spread))), 1)

    uptime_secs = int(time.time() - _START_TIME)

    servers = [
        {
            "name": "node-1",
            "role": "web",
            "ip": "10.0.0.1",
            "cpu": jitter(real_cpu, 1),
            "ram": jitter(real_ram, 2),
            "disk": jitter(real_disk, 3, 5),
            "uptime": uptime_secs,
            "status": "healthy",
        },
        {
            "name": "node-2",
            "role": "api",
            "ip": "10.0.0.2",
            "cpu": jitter(real_cpu + 20, 4),
            "ram": jitter(real_ram + 15, 5),
            "disk": jitter(real_disk + 10, 6, 5),
            "uptime": uptime_secs,
            "status": "warning",
        },
        {
            "name": "node-3",
            "role": "db",
            "ip": "10.0.0.3",
            "cpu": jitter(real_cpu - 5, 7),
            "ram": jitter(real_ram - 10, 8),
            "disk": jitter(real_disk + 25, 9, 5),
            "uptime": uptime_secs,
            "status": "healthy",
        },
    ]
    return servers


def _update_server_history(servers: list[dict[str, Any]]) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    for s in servers:
        name = s["name"]
        if name not in _server_history:
            _server_history[name] = []
        _server_history[name].append({"ts": ts, "cpu": s["cpu"], "ram": s["ram"], "disk": s["disk"]})
        if len(_server_history[name]) > _HISTORY_MAX:
            _server_history[name] = _server_history[name][-_HISTORY_MAX:]


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.add(websocket)
        live_clients_gauge.set(len(self._clients))

    def disconnect(self, websocket: WebSocket) -> None:
        self._clients.discard(websocket)
        live_clients_gauge.set(len(self._clients))

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self._clients:
            return
        payload = message.copy()
        stale_clients: list[WebSocket] = []
        for client in list(self._clients):
            try:
                await client.send_json(payload)
            except Exception:
                stale_clients.append(client)
        for client in stale_clients:
            self.disconnect(client)


manager = ConnectionManager()
background_task: asyncio.Task[None] | None = None


async def query_prometheus(expr: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": expr},
        )
        response.raise_for_status()
        return response.json()


async def query_prometheus_scalar(expr: str) -> float | None:
    try:
        res = await query_prometheus(expr)
        if res.get("status") != "success":
            return None
        results = res.get("data", {}).get("result", [])
        if not results:
            return None
        val = results[0].get("value", [None, None])[1]
        if val is None:
            return None
        return float(val)
    except Exception:
        return None


async def get_current_metrics() -> dict[str, Any]:
    cpu_expr = '100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])))'
    ram_expr = '100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)'
    disk_expr = '100 * (1 - sum(node_filesystem_avail_bytes) / sum(node_filesystem_size_bytes))'
    uptime_expr = 'time() - node_boot_time_seconds'

    cpu_val, ram_val, disk_val, uptime_val = await asyncio.gather(
        query_prometheus_scalar(cpu_expr),
        query_prometheus_scalar(ram_expr),
        query_prometheus_scalar(disk_expr),
        query_prometheus_scalar(uptime_expr),
    )

    source = "prometheus"

    if cpu_val is None or ram_val is None or disk_val is None or uptime_val is None:
        try:
            cpu_val = cpu_val if cpu_val is not None else psutil.cpu_percent(interval=0.5)
            mem = psutil.virtual_memory()
            ram_val = ram_val if ram_val is not None else (100.0 - (mem.available / mem.total * 100.0))
            disk = psutil.disk_usage("/")
            disk_val = disk_val if disk_val is not None else (100.0 - (disk.free / disk.total * 100.0))
            uptime_val = uptime_val if uptime_val is not None else (datetime.now(timezone.utc).timestamp() - psutil.boot_time())
            source = "psutil"
        except Exception:
            cpu_val = cpu_val or 0.0
            ram_val = ram_val or 0.0
            disk_val = disk_val or 0.0
            uptime_val = uptime_val or 0.0

    def clamp_round(v: float) -> float:
        try:
            v = float(v)
        except Exception:
            return 0.0
        if v < 0:
            v = 0.0
        if v > 100 and v != 1000.0:
            v = 100.0
        return round(v, 2)

    cpu_percent = clamp_round(cpu_val)
    ram_percent = clamp_round(ram_val)
    disk_percent = clamp_round(disk_val)

    try:
        uptime_seconds = int(float(uptime_val))
    except Exception:
        uptime_seconds = 0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "disk_percent": disk_percent,
        "uptime_seconds": uptime_seconds,
        "prometheus": PROMETHEUS_URL,
    }


async def get_active_alerts() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{ALERTMANAGER_URL}/api/v2/alerts")
            response.raise_for_status()
            alerts = response.json()
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "alertmanager": ALERTMANAGER_URL,
            "alerts": alerts,
        }
    except Exception:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "alertmanager": ALERTMANAGER_URL,
            "alerts": [],
        }


async def live_metrics_publisher() -> None:
    while True:
        try:
            metrics = await get_current_metrics()
            servers = _simulated_servers()
            _update_server_history(servers)
            await manager.broadcast({**metrics, "servers": servers})
        except Exception:
            pass
        await asyncio.sleep(METRICS_REFRESH_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task
    background_task = asyncio.create_task(live_metrics_publisher())
    try:
        yield
    finally:
        if background_task is not None:
            background_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await background_task


app = FastAPI(title="AI DevOps Monitoring API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _fetch_active_alert_names() -> list[str]:
    try:
        data = await get_active_alerts()
        return [
            a.get("labels", {}).get("alertname", a.get("name", "Alert"))
            for a in data.get("alerts", [])
        ]
    except Exception:
        return []


@app.get("/api/chat")
async def api_chat(
    q: str = "",
    cpu: float = 0.0,
    ram: float = 0.0,
    disk: float = 0.0,
) -> dict[str, str]:
    request_counter.labels(path="/api/chat", method="GET").inc()
    # Use live metrics if caller didn't provide them
    if cpu == 0.0 and ram == 0.0:
        try:
            live = await get_current_metrics()
            cpu  = live.get("cpu_percent",  cpu)
            ram  = live.get("ram_percent",  ram)
            disk = live.get("disk_percent", disk)
        except Exception:
            pass
    alerts = await _fetch_active_alert_names()
    response_text, model_used = await ai_chat_response(q, cpu, ram, disk, alerts)
    return {"response": response_text, "model": model_used}


@app.get("/health")
def health() -> dict[str, str]:
    request_counter.labels(path="/health", method="GET").inc()
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/metrics")
async def api_metrics() -> dict[str, Any]:
    request_counter.labels(path="/api/metrics", method="GET").inc()
    return await get_current_metrics()


@app.get("/api/alerts")
async def api_alerts() -> dict[str, Any]:
    request_counter.labels(path="/api/alerts", method="GET").inc()
    return await get_active_alerts()


@app.get("/api/servers")
async def api_servers() -> list[dict[str, Any]]:
    request_counter.labels(path="/api/servers", method="GET").inc()
    servers = _simulated_servers()
    _update_server_history(servers)
    return servers


@app.get("/api/servers/{name}/history")
async def api_server_history(name: str) -> dict[str, Any]:
    request_counter.labels(path="/api/servers/{name}/history", method="GET").inc()
    history = _server_history.get(name, [])
    return {"name": name, "history": history}


@app.get("/api/predict")
async def api_predict() -> dict[str, Any]:
    request_counter.labels(path="/api/predict", method="GET").inc()
    try:
        return await generate_prediction(prometheus_url=PROMETHEUS_URL)
    except Exception:
        metrics = await get_current_metrics()
        cpu = metrics.get("cpu_percent", 20.0)
        will_overload = cpu > 70
        return {
            "will_overload": will_overload,
            "predicted_max_cpu": round(cpu * 1.25, 1),
            "minutes_until_overload": 18 if will_overload else 0,
            "confidence": 0.85,
            "forecast": [],
            "history": [],
        }


@app.post("/api/incident-report")
async def api_incident_report(payload: dict[str, Any] = Body(...)) -> dict[str, str]:
    request_counter.labels(path="/api/incident-report", method="POST").inc()

    alert = payload.get("alert_data") or payload.get("alert") or {}
    if not isinstance(alert, dict):
        alert = {}

    metrics = payload.get("metrics_data") or payload.get("metrics") or {}
    if not isinstance(metrics, dict):
        metrics = {}

    report_text, model_used = await ai_incident_report(
        alert_name=alert.get("name", "Unknown"),
        severity=alert.get("severity", "warning"),
        description=alert.get("description", ""),
        cpu_history=metrics.get("cpu_history", metrics.get("cpu", [])),
        ram_history=metrics.get("ram_history", metrics.get("ram", [])),
    )
    return {"report": report_text, "model": model_used}


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
