import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/metrics_snapshot.dart';
import '../models/alert_model.dart';

class LocalStorageService {
  static const _keyMetrics       = 'cached_metrics';
  static const _keyAlerts        = 'cached_alerts';
  static const _keyPinEnabled    = 'pin_enabled';
  static const _keyPin           = 'pin_value';
  static const _keyBackendUrl    = 'backend_url';
  static const _keyRefreshInterval = 'refresh_interval';
  static const _keyNotifications = 'notifications_enabled';
  static const _keyMockData      = 'use_mock_data';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get _p {
    if (_prefs == null) throw StateError('LocalStorageService not initialized');
    return _prefs!;
  }

  static Future<void> saveMetrics(MetricsSnapshot m) async {
    await _p.setString(_keyMetrics, jsonEncode(m.toJson()));
  }

  static MetricsSnapshot? loadMetrics() {
    final s = _p.getString(_keyMetrics);
    if (s == null) return null;
    try {
      return MetricsSnapshot.fromJson(jsonDecode(s) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveAlerts(List<AlertModel> alerts) async {
    await _p.setString(_keyAlerts, jsonEncode(alerts.map((a) => a.toJson()).toList()));
  }

  static List<AlertModel> loadAlerts() {
    final s = _p.getString(_keyAlerts);
    if (s == null) return [];
    try {
      final list = jsonDecode(s) as List<dynamic>;
      return list.map((e) => AlertModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> savePinEnabled(bool v)   async => _p.setBool(_keyPinEnabled, v);
  static bool   loadPinEnabled()                       => _p.getBool(_keyPinEnabled) ?? false;

  static Future<void> savePin(String pin)       async => _p.setString(_keyPin, pin);
  static String? loadPin()                             => _p.getString(_keyPin);

  static Future<void> saveBackendUrl(String url) async => _p.setString(_keyBackendUrl, url);
  static String? loadBackendUrl()                      => _p.getString(_keyBackendUrl);

  static Future<void> saveRefreshInterval(int s) async => _p.setInt(_keyRefreshInterval, s);
  static int    loadRefreshInterval()                  => _p.getInt(_keyRefreshInterval) ?? 3;

  static Future<void> saveNotificationsEnabled(bool v) async => _p.setBool(_keyNotifications, v);
  static bool   loadNotificationsEnabled()                    => _p.getBool(_keyNotifications) ?? true;

  static Future<void> saveMockDataEnabled(bool v) async => _p.setBool(_keyMockData, v);
  static bool   loadMockDataEnabled()                   => _p.getBool(_keyMockData) ?? false;
}
