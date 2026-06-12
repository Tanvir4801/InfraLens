import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../constants/app_constants.dart';
import '../models/metrics_snapshot.dart';

enum WsState { connecting, connected, disconnected }

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._();
  factory WebSocketService() => _instance;
  WebSocketService._();

  WebSocketChannel? _channel;
  final _metricsCtrl = StreamController<MetricsSnapshot>.broadcast();
  final _stateCtrl   = StreamController<WsState>.broadcast();

  Stream<MetricsSnapshot> get metricsStream  => _metricsCtrl.stream;
  Stream<WsState>         get connectionState => _stateCtrl.stream;

  WsState _currentState = WsState.disconnected;
  WsState get state     => _currentState;

  bool   _disposed    = false;
  int    _retryCount  = 0;
  Timer? _retryTimer;

  // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (capped)
  static const _backoff = [1, 2, 4, 8, 16, 30];

  void connect() {
    if (_disposed) return;
    _setState(WsState.connecting);
    try {
      final uri = Uri.parse('${AppConstants.wsBaseUrl}/ws/live');
      _channel = WebSocketChannel.connect(uri);
      _channel!.stream.listen(
        _onData,
        onError: (e) {
          _setState(WsState.disconnected);
          _scheduleReconnect();
        },
        onDone: () {
          _setState(WsState.disconnected);
          _scheduleReconnect();
        },
        cancelOnError: false,
      );
      _setState(WsState.connected);
      _retryCount = 0;
    } catch (_) {
      _setState(WsState.disconnected);
      _scheduleReconnect();
    }
  }

  void _onData(dynamic data) {
    _setState(WsState.connected);
    _retryCount = 0;
    try {
      final json = jsonDecode(data as String) as Map<String, dynamic>;
      if (!_metricsCtrl.isClosed) {
        _metricsCtrl.add(MetricsSnapshot.fromJson(json));
      }
    } catch (_) {}
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _channel = null;
    final delay = _backoff[_retryCount.clamp(0, _backoff.length - 1)];
    _retryCount++;
    _retryTimer?.cancel();
    _retryTimer = Timer(Duration(seconds: delay), () {
      if (!_disposed) connect();
    });
  }

  void _setState(WsState s) {
    if (_currentState == s) return;
    _currentState = s;
    if (!_stateCtrl.isClosed) _stateCtrl.add(s);
  }

  void dispose() {
    _disposed = true;
    _retryTimer?.cancel();
    _channel?.sink.close();
    _metricsCtrl.close();
    _stateCtrl.close();
  }
}
