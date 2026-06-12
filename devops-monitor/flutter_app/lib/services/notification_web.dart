import 'dart:js_interop';
import 'notification_interface.dart';

@JS('infraLensRequestNotifications')
external void _requestNotifications();

@JS('infraLensShowNotification')
external void _showNotification(JSString title, JSString body);

@JS('infraLensGetNotificationPermission')
external JSString _getPermission();

class NotificationPlatform implements NotificationPlatformInterface {
  @override
  Future<void> init() async {
    _requestNotifications();
  }

  @override
  Future<void> show(String title, String body) async {
    _showNotification(title.toJS, body.toJS);
  }

  @override
  String getPermission() {
    try {
      return _getPermission().toDart;
    } catch (_) {
      return 'unknown';
    }
  }
}
