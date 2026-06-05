import 'dart:math';
import '../models/metrics_snapshot.dart';
import '../models/server_info.dart';
import '../models/alert_model.dart';
import '../models/prediction_result.dart';
import '../models/incident_report.dart';

class MockDataService {
  static final _rng = Random();

  static double _jitter(double base, {double spread = 10.0}) =>
      (base + (_rng.nextDouble() * spread * 2) - spread).clamp(1.0, 99.0);

  static MetricsSnapshot fetchMetrics() => MetricsSnapshot(
        timestamp:     DateTime.now().toIso8601String(),
        source:        'mock',
        cpuPercent:    _jitter(42.0),
        ramPercent:    _jitter(61.0),
        diskPercent:   _jitter(55.0, spread: 3.0),
        uptimeSeconds: 432000 + _rng.nextInt(1000),
      );

  static List<ServerInfo> fetchServers() => [
        ServerInfo(
          name: 'node-1', role: 'web', ip: '10.0.0.1',
          cpu: _jitter(38.0), ram: _jitter(55.0), disk: _jitter(52.0, spread: 4.0),
          uptime: 432000, status: 'healthy',
        ),
        ServerInfo(
          name: 'node-2', role: 'api', ip: '10.0.0.2',
          cpu: _jitter(72.0), ram: _jitter(78.0), disk: _jitter(65.0, spread: 4.0),
          uptime: 432000, status: 'warning',
        ),
        ServerInfo(
          name: 'node-3', role: 'db', ip: '10.0.0.3',
          cpu: _jitter(28.0), ram: _jitter(45.0), disk: _jitter(80.0, spread: 4.0),
          uptime: 432000, status: 'healthy',
        ),
      ];

  static List<AlertModel> fetchAlerts() => [
        const AlertModel(
          id: 'alert-1',
          name: 'HighCpuUsage',
          severity: 'warning',
          description: 'CPU usage on node-2 has exceeded 70% for the last 5 minutes.',
          firedAt: '2025-01-15T08:23:00Z',
          status: 'firing',
        ),
        const AlertModel(
          id: 'alert-2',
          name: 'DiskSpaceLow',
          severity: 'critical',
          description: 'Disk usage on node-3 is at 80% — reaching critical threshold.',
          firedAt: '2025-01-15T07:55:00Z',
          status: 'firing',
        ),
        const AlertModel(
          id: 'alert-3',
          name: 'HighMemoryUsage',
          severity: 'warning',
          description: 'Memory usage on node-2 exceeded 75%.',
          firedAt: '2025-01-15T08:10:00Z',
          status: 'firing',
        ),
      ];

  static PredictionResult fetchPrediction() {
    final willOverload = _rng.nextBool();
    return PredictionResult(
      willOverload:         willOverload,
      predictedMaxCpu:      willOverload ? _jitter(88.0, spread: 5.0) : _jitter(55.0, spread: 8.0),
      minutesUntilOverload: willOverload ? 10 + _rng.nextInt(20) : 0,
      confidence:           0.72 + _rng.nextDouble() * 0.2,
      forecast: List.generate(6, (i) => {
            'ds': DateTime.now().add(Duration(minutes: (i + 1) * 5)).toIso8601String(),
            'yhat': willOverload
                ? _jitter(70.0 + i * 4.0, spread: 3.0)
                : _jitter(45.0 + i * 1.5, spread: 3.0),
          }),
      history: List.generate(20, (i) => {
            'ds': DateTime.now().subtract(Duration(minutes: (20 - i) * 5)).toIso8601String(),
            'y':  _jitter(40.0 + i * 1.2, spread: 5.0),
          }),
    );
  }

  static List<Map<String, dynamic>> fetchServerHistory(String name) =>
      List.generate(12, (i) => {
            'ts': DateTime.now()
                .subtract(Duration(minutes: (12 - i) * 5))
                .toIso8601String(),
            'cpu':  _jitter(40.0 + i * 2.0, spread: 6.0),
            'ram':  _jitter(55.0 + i * 0.5, spread: 4.0),
            'disk': _jitter(52.0,             spread: 2.0),
          });

  static IncidentReport postIncidentReport(AlertModel alert) => IncidentReport.fromText(
        '''Incident Report — ${alert.name}

1. What happened
   Alert "${alert.name}" fired with severity ${alert.severity}.
   ${alert.description}

2. Likely root cause
   Based on observed metrics, the primary suspect is resource saturation
   on the affected node. CPU or memory pressure may have triggered
   cascading effects.

3. Immediate recommended actions
   • Check running processes: top / htop on the affected node
   • Review recent deployments for resource-intensive changes
   • Consider scaling up or load-balancing the service

4. Prevention steps
   • Tighten alert thresholds and add predictive alerts
   • Add horizontal pod autoscaling for bursty workloads
   • Review capacity planning and set headroom targets (≤70% avg)''',
      );

  static String postAiChat(String question) {
    final q = question.toLowerCase();
    if (q.contains('cpu')) {
      return 'Based on current telemetry, CPU usage is elevated on node-2 (~72%). '
          'This is likely caused by increased API traffic. '
          'Consider scaling or adding a load balancer.';
    }
    if (q.contains('disk') || q.contains('storage')) {
      return 'Disk usage on node-3 is approaching 80%. '
          'I recommend archiving old logs and enabling log rotation. '
          'Consider expanding storage if growth rate continues.';
    }
    if (q.contains('alert') || q.contains('alarm')) {
      return 'You currently have active alerts: HighCpuUsage (warning) and DiskSpaceLow (critical). '
          'The critical disk alert on node-3 needs immediate attention.';
    }
    if (q.contains('health') || q.contains('status')) {
      return 'Overall system health is moderate. '
          '2 of 3 nodes are healthy. node-2 is under elevated load. '
          'Health score is approximately 68/100.';
    }
    return 'I\'m InfraLens AI, your DevOps assistant. '
        'I can help you analyze infrastructure metrics, investigate alerts, '
        'and predict potential issues. Ask me about CPU, memory, disk, alerts, or server health!';
  }
}
