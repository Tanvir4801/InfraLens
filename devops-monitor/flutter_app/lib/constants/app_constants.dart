import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConstants {
  /// Derives the backend base URL dynamically for Replit web environments.
  /// Replit URL pattern:
  ///   Primary (port 5000): name-00-user.replit.dev
  ///   Port 3000: name-00-3000--user.replit.dev
  ///   Port 8000: name-00-8000--user.replit.dev
  static String get backendBaseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.contains('replit.dev') || host.contains('repl.co')) {
        final derived = _deriveBackendHost(host);
        return 'https://$derived';
      }
      return 'http://localhost:8000';
    }
    // Native (iOS/Android) — use .env or fallback
    return dotenv.maybeGet('BASE_URL') ?? 'http://localhost:8000';
  }

  static String get wsBaseUrl {
    if (kIsWeb) {
      final host = Uri.base.host;
      if (host.contains('replit.dev') || host.contains('repl.co')) {
        final derived = _deriveBackendHost(host);
        return 'wss://$derived';
      }
      return 'ws://localhost:8000';
    }
    return dotenv.maybeGet('WS_URL') ?? 'ws://localhost:8000';
  }

  /// Replace whichever port is in the Replit host with 8000.
  /// Handles: -PORT-- (port-specific) and -00- (primary domain).
  static String _deriveBackendHost(String host) {
    // If host already contains a port segment like -3000-- or -5000--
    final portPattern = RegExp(r'-(\d{3,5})--');
    if (portPattern.hasMatch(host)) {
      return host.replaceFirstMapped(portPattern, (_) => '-8000--');
    }
    // Primary domain: name-00-user.replit.dev → name-00-8000--user.replit.dev
    return host.replaceFirst('-00-', '-00-8000--');
  }

  static String get baseUrl => backendBaseUrl;
  static String get wsUrl   => wsBaseUrl;

  static const metricsRefreshSeconds    = 3;
  static const alertsRefreshSeconds     = 30;
  static const serversRefreshSeconds    = 10;
  static const predictionRefreshSeconds = 300;

  static const historyMaxPoints  = 20;
  static const overloadThreshold = 85.0;
}
