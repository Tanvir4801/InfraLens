abstract class NotificationPlatformInterface {
  Future<void> init();
  Future<void> show(String title, String body);
  String getPermission();
}
