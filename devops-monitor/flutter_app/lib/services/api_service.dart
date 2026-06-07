import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import '../models/metrics_snapshot.dart';
import '../models/server_info.dart';
import '../models/alert_model.dart';
import '../models/prediction_result.dart';
import '../models/incident_report.dart';
import 'local_storage_service.dart';
import 'mock_data_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._();
  factory ApiService() => _instance;
  ApiService._();

  String get _base => LocalStorageService.loadBackendUrl() ?? AppConstants.backendBaseUrl;
  bool   get _mock => LocalStorageService.loadMockDataEnabled();

  static const _timeout = Duration(seconds: 10);

  Future<MetricsSnapshot> fetchMetrics() async {
    if (_mock) return MockDataService.fetchMetrics();
    try {
      final r = await http.get(Uri.parse('$_base/api/metrics')).timeout(_timeout);
      if (r.statusCode == 200) {
        final m = MetricsSnapshot.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
        await LocalStorageService.saveMetrics(m);
        return m;
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return LocalStorageService.loadMetrics() ?? MockDataService.fetchMetrics();
    }
  }

  Future<List<ServerInfo>> fetchServers() async {
    if (_mock) return MockDataService.fetchServers();
    try {
      final r = await http.get(Uri.parse('$_base/api/servers')).timeout(_timeout);
      if (r.statusCode == 200) {
        final list = jsonDecode(r.body) as List<dynamic>;
        return list.map((e) => ServerInfo.fromJson(e as Map<String, dynamic>)).toList();
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return MockDataService.fetchServers();
    }
  }

  Future<List<AlertModel>> fetchAlerts() async {
    if (_mock) return MockDataService.fetchAlerts();
    try {
      final r = await http.get(Uri.parse('$_base/api/alerts')).timeout(_timeout);
      if (r.statusCode == 200) {
        final data  = jsonDecode(r.body) as Map<String, dynamic>;
        final alerts = data['alerts'] as List<dynamic>? ?? [];
        final result = alerts
            .map((e) => AlertModel.fromJson(e as Map<String, dynamic>))
            .toList();
        await LocalStorageService.saveAlerts(result);
        return result;
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return LocalStorageService.loadAlerts();
    }
  }

  Future<PredictionResult> fetchPrediction() async {
    if (_mock) return MockDataService.fetchPrediction();
    try {
      final r = await http.get(Uri.parse('$_base/api/predict')).timeout(_timeout);
      if (r.statusCode == 200) {
        return PredictionResult.fromJson(jsonDecode(r.body) as Map<String, dynamic>);
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return MockDataService.fetchPrediction();
    }
  }

  Future<List<Map<String, dynamic>>> fetchServerHistory(String name) async {
    if (_mock) return MockDataService.fetchServerHistory(name);
    try {
      final r = await http.get(Uri.parse('$_base/api/servers/$name/history')).timeout(_timeout);
      if (r.statusCode == 200) {
        final data = jsonDecode(r.body) as Map<String, dynamic>;
        return (data['history'] as List<dynamic>?)
                ?.map((e) => Map<String, dynamic>.from(e as Map))
                .toList() ?? [];
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return MockDataService.fetchServerHistory(name);
    }
  }

  Future<IncidentReport> postIncidentReport(
    AlertModel alert, {
    List<double> cpuHistory = const [],
    List<double> ramHistory = const [],
  }) async {
    if (_mock) return MockDataService.postIncidentReport(alert);
    try {
      final body = jsonEncode({
        'alert_data': alert.toJson(),
        'metrics': {
          'cpu_history': cpuHistory,
          'ram_history': ramHistory,
        },
      });
      final r = await http.post(
        Uri.parse('$_base/api/incident-report'),
        headers: {'Content-Type': 'application/json'},
        body: body,
      ).timeout(const Duration(seconds: 30));
      if (r.statusCode == 200) {
        final data = jsonDecode(r.body) as Map<String, dynamic>;
        final text = data['report'] as String? ?? r.body;
        return IncidentReport.fromText(text);
      }
      throw HttpException('Status ${r.statusCode}');
    } catch (_) {
      return MockDataService.postIncidentReport(alert);
    }
  }

  Future<String> postAiChat(
    String question, {
    double cpu = 0,
    double ram = 0,
    double disk = 0,
    int uptime = 0,
    List<String> alerts = const [],
  }) async {
    if (_mock) return MockDataService.postAiChat(question);
    try {
      final uri = Uri.parse('$_base/api/chat').replace(queryParameters: {
        'q': question,
        'cpu':  cpu.toStringAsFixed(1),
        'ram':  ram.toStringAsFixed(1),
        'disk': disk.toStringAsFixed(1),
        'uptime': uptime.toString(),
        'alerts': alerts.join(','),
      });
      final r = await http.get(uri).timeout(_timeout);
      if (r.statusCode == 200) {
        final data = jsonDecode(r.body) as Map<String, dynamic>;
        return data['response'] as String? ?? data['answer'] as String? ?? r.body;
      }
      return MockDataService.postAiChat(question);
    } catch (_) {
      return MockDataService.postAiChat(question);
    }
  }

  Future<void> acknowledgeAlert(String id) async {
    if (_mock) return;
    try {
      await http.patch(Uri.parse('$_base/api/alerts/$id/acknowledge')).timeout(_timeout);
    } catch (_) {}
  }
}
