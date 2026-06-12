import '../models/alert_model.dart';
import 'notification_stub.dart'
    if (dart.library.js_interop) 'notification_web.dart';

typedef CriticalAlertCallback = void Function(AlertModel alert);

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  final _platform = NotificationPlatform();
  bool _initialized = false;

  /// AppShell registers this to show the in-app banner overlay.
  CriticalAlertCallback? onCriticalAlert;

  Future<void> init() async {
    await _platform.init();
    _initialized = true;
  }

  String get permissionStatus => _platform.getPermission();

  Future<void> requestPermission() async {
    await _platform.init();
  }

  Future<void> showCriticalAlert(AlertModel alert) async {
    if (!_initialized) return;
    // 1) Browser / OS notification
    final title = '${alert.name} — Critical';
    final body  = alert.description.isNotEmpty
        ? alert.description
        : 'A critical infrastructure alert was detected.';
    await _platform.show(title, body);
    // 2) In-app banner (works even if browser notifications are blocked)
    onCriticalAlert?.call(alert);
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
