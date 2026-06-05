import asyncio
import contextlib
import os
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

from incident_report import generate_incident_report
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
    """Run an instant Prometheus expression and return the first scalar value or None."""
    try:
        res = await query_prometheus(expr)
        if res.get("status") != "success":
            return None
        results = res.get("data", {}).get("result", [])
        if not results:
            return None
        # Prometheus instant vector value is [ <timestamp>, "<value>" ]
        val = results[0].get("value", [None, None])[1]
        if val is None:
            return None
        return float(val)
    except Exception:
        return None


async def get_current_metrics() -> dict[str, Any]:
    # Try to compute normalized percentages via Prometheus queries first
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

    # Fallback to psutil when Prometheus values are not available
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
            # If psutil also fails, set safe defaults
            cpu_val = cpu_val or 0.0
            ram_val = ram_val or 0.0
            disk_val = disk_val or 0.0
            uptime_val = uptime_val or 0.0

    # Clamp and round values for UI consumption
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
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{ALERTMANAGER_URL}/api/v2/alerts")
        response.raise_for_status()
        alerts = response.json()
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "alertmanager": ALERTMANAGER_URL,
        "alerts": alerts,
    }


async def live_metrics_publisher() -> None:
    while True:
        try:
            metrics = await get_current_metrics()
            await manager.broadcast(metrics)
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


app = FastAPI(title="AI DevOps Monitoring API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/predict")
async def api_predict() -> dict[str, Any]:
    request_counter.labels(path="/api/predict", method="GET").inc()
    return await generate_prediction(prometheus_url=PROMETHEUS_URL)


@app.post("/api/incident-report")
async def api_incident_report(payload: dict[str, Any] = Body(...)) -> Response:
    request_counter.labels(path="/api/incident-report", method="POST").inc()

    alert_data = payload.get("alert_data") or payload.get("alert")
    if not isinstance(alert_data, dict):
        alert_data = {}

    metrics_data = payload.get("metrics_data")
    if not isinstance(metrics_data, dict):
        metrics_data = None

    report = await generate_incident_report(alert_data=alert_data, metrics_data=metrics_data)
    return Response(content=report, media_type="text/plain")


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
