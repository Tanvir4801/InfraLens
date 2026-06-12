import 'notification_interface.dart';

class NotificationPlatform implements NotificationPlatformInterface {
  @override
  Future<void> init() async {}

  @override
  Future<void> show(String title, String body) async {}

  @override
  String getPermission() => 'native';
}
