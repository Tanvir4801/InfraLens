import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import '../providers/alerts_provider.dart';

class SseService {
  static final SseService _instance = SseService._();
  factory SseService() => _instance;
  SseService._();
  
  final _alertCtrl = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get alertStream => _alertCtrl.stream;
  
  StreamSubscription? _sub;
  bool _disposed = false;
  AlertsProvider? _alertsProvider;
  
  void setAlertsProvider(AlertsProvider p) {
    _alertsProvider = p;
  }
  
  void connect() {
    _sub?.cancel();
    _listen();
  }
  
  void _listen() async {
    if (_disposed) return;
    try {
      final client = http.Client();
      final req = http.Request('GET', Uri.parse('${AppConstants.backendBaseUrl}/api/events'));
      req.headers['Accept'] = 'text/event-stream';
      req.headers['Cache-Control'] = 'no-cache';
      final resp = await client.send(req).timeout(const Duration(seconds: 10));
      if (resp.statusCode == 200) {
        _sub = resp.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
            (line) {
              if (line.startsWith('data: ')) {
                try {
                  final data = jsonDecode(line.substring(6)) as Map<String, dynamic>;
                  if (data['type'] == 'alert') {
                    final alertData = data['data'] as Map<String, dynamic>;
                    if (!_alertCtrl.isClosed) _alertCtrl.add(alertData);
                    _alertsProvider?.fetch(); // Trigger a refresh when an alert comes in
                  }
                } catch (_) {}
              }
            },
            onDone: () => Future.delayed(const Duration(seconds: 5), _listen),
            onError: (_) => Future.delayed(const Duration(seconds: 5), _listen),
          );
      } else {
        Future.delayed(const Duration(seconds: 5), _listen);
      }
    } catch (_) {
      Future.delayed(const Duration(seconds: 5), _listen);
    }
  }
  
  void dispose() {
    _disposed = true;
    _sub?.cancel();
    _alertCtrl.close();
  }
}
