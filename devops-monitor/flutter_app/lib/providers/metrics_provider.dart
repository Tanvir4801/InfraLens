import 'dart:async';
import 'package:flutter/foundation.dart';
import '../constants/app_constants.dart';
import '../models/metrics_snapshot.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

class MetricsProvider extends ChangeNotifier {
  final _api = ApiService();
  final _ws  = WebSocketService();

  MetricsSnapshot? _snapshot;
  WsState _wsState = WsState.disconnected;
  final List<double> _rollingHistory = [];
  StreamSubscription<MetricsSnapshot>? _metricsSub;
  StreamSubscription<WsState>? _stateSub;
  Timer? _pollTimer;

  MetricsSnapshot? get snapshot       => _snapshot;
  WsState          get wsState        => _wsState;
  List<double>     get rollingHistory => List.unmodifiable(_rollingHistory);

  double get healthScore {
    if (_snapshot == null) return 0;
    final s = _snapshot!;
    final alertPenalty = 0.0; // updated by AlertsProvider externally
    return (100 -
            (s.cpuPercent * 0.4 +
             s.ramPercent * 0.3 +
             s.diskPercent * 0.2 +
             alertPenalty * 0.1))
        .clamp(0.0, 100.0);
  }

  double healthScoreWithAlerts(int criticalCount, int warningCount) {
    if (_snapshot == null) return 0;
    final s = _snapshot!;
    final alertPenalty = criticalCount * 15.0 + warningCount * 5.0;
    return (100 -
            (s.cpuPercent * 0.4 +
             s.ramPercent * 0.3 +
             s.diskPercent * 0.2 +
             alertPenalty * 0.1))
        .clamp(0.0, 100.0);
  }

  void init() {
    _ws.connect();
    _metricsSub = _ws.metricsStream.listen(_onMetrics);
    _stateSub   = _ws.connectionState.listen(_onWsState);
    // Also poll as fallback
    _pollTimer = Timer.periodic(
      Duration(seconds: AppConstants.metricsRefreshSeconds),
      (_) => _pollMetrics(),
    );
    _pollMetrics();
  }

  Future<void> _pollMetrics() async {
    try {
      final m = await _api.fetchMetrics();
      _onMetrics(m);
    } catch (_) {}
  }

  void _onMetrics(MetricsSnapshot m) {
    _snapshot = m;
    _rollingHistory.add(m.cpuPercent);
    if (_rollingHistory.length > AppConstants.historyMaxPoints) {
      _rollingHistory.removeAt(0);
    }
    notifyListeners();
  }

  void _onWsState(WsState s) {
    _wsState = s;
    notifyListeners();
  }

  Future<void> fetchNow() async {
    await _pollMetrics();
  }

  @override
  void dispose() {
    _metricsSub?.cancel();
    _stateSub?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }
}
