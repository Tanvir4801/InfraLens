import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  static String get baseUrl =>
      dotenv.maybeGet('BASE_URL') ?? 'http://localhost:8000';

  static String get wsUrl =>
      dotenv.maybeGet('WS_URL') ?? 'ws://localhost:8000';

  static const metricsRefreshSeconds = 3;
  static const alertsRefreshSeconds  = 30;
  static const serversRefreshSeconds = 10;
  static const predictionRefreshSeconds = 300;

  static const historyMaxPoints = 20;
  static const overloadThreshold = 85.0;
}
