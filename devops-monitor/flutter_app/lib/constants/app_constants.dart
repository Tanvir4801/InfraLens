import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConstants {
  static String get backendBaseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.contains('replit.dev')) {
        final derivedHost = host.replaceFirst('-00-', '-00-8000--');
        return 'https://$derivedHost';
      }
      return 'http://localhost:8000';
    }
    return dotenv.maybeGet('BASE_URL') ?? 'http://localhost:8000';
  }

  static String get wsBaseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.contains('replit.dev')) {
        final derivedHost = host.replaceFirst('-00-', '-00-8000--');
        return 'wss://$derivedHost';
      }
      return 'ws://localhost:8000';
    }
    return dotenv.maybeGet('WS_URL') ?? 'ws://localhost:8000';
  }

  static String get baseUrl => backendBaseUrl;
  static String get wsUrl => wsBaseUrl;

  static const metricsRefreshSeconds = 3;
  static const alertsRefreshSeconds  = 30;
  static const serversRefreshSeconds = 10;
  static const predictionRefreshSeconds = 300;

  static const historyMaxPoints = 20;
  static const overloadThreshold = 85.0;
}
