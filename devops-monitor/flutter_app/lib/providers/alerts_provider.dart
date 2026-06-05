import 'dart:async';
import 'package:flutter/foundation.dart';
import '../constants/app_constants.dart';
import '../models/alert_model.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class AlertsProvider extends ChangeNotifier {
  final _api          = ApiService();
  final _notification = NotificationService();

  List<AlertModel> _alerts      = [];
  Set<String>      _acknowledged = {};
  bool _loading = false;
  Timer? _timer;

  List<AlertModel> get allAlerts      => _alerts;
  bool             get isLoading      => _loading;
  int              get criticalCount  => _alerts.where((a) => a.isCritical && !_acknowledged.contains(a.id)).length;
  int              get warningCount   => _alerts.where((a) => !a.isCritical && !_acknowledged.contains(a.id)).length;
  int              get activeCount    => criticalCount + warningCount;

  List<AlertModel> filteredAlerts(String severity) {
    final active = _alerts.where((a) => !_acknowledged.contains(a.id)).toList();
    if (severity == 'all') return active;
    return active.where((a) => a.severity.toLowerCase() == severity.toLowerCase()).toList();
  }

  void init() {
    fetch();
    _timer = Timer.periodic(
      const Duration(seconds: AppConstants.alertsRefreshSeconds),
      (_) => fetch(),
    );
  }

  Future<void> fetch() async {
    _loading = true;
    notifyListeners();
    try {
      final old = List<AlertModel>.from(_alerts);
      _alerts = await _api.fetchAlerts();
      await _notification.compareAndNotify(_alerts, old);
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  void acknowledge(String id) {
    _acknowledged.add(id);
    _api.acknowledgeAlert(id).ignore();
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
