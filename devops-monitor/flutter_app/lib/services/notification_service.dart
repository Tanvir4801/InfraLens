import '../models/alert_model.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  bool _initialized = false;

  Future<void> init() async {
    _initialized = true;
  }

  Future<void> showCriticalAlert(AlertModel alert) async {
    if (!_initialized) return;
    // On web, flutter_local_notifications is not supported.
    // Notifications are handled via in-app banners instead.
  }

  Future<void> compareAndNotify(
    List<AlertModel> newAlerts,
    List<AlertModel> oldAlerts,
  ) async {
    if (!_initialized) return;
    final oldIds = oldAlerts.map((a) => a.id).toSet();
    for (final alert in newAlerts) {
      if (alert.isCritical && !oldIds.contains(alert.id)) {
        await showCriticalAlert(alert);
      }
    }
  }
}
