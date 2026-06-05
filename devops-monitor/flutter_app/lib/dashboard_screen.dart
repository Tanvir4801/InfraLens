import 'dart:async';
import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class DashboardController extends ChangeNotifier {
  DashboardController({this.socketUrl = 'ws://10.194.193.201:8000/ws/live'});

  final String socketUrl;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  bool _connected = false;
  bool _disposed = false;

  double _cpuPercent = 0;
  double _ramPercent = 0;
  double _diskPercent = 0;
  int _uptimeSeconds = 0;

  bool get connected => _connected;
  double get cpuPercent => _cpuPercent;
  double get ramPercent => _ramPercent;
  double get diskPercent => _diskPercent;
  int get uptimeSeconds => _uptimeSeconds;

  void connect() {
    if (_disposed) {
      return;
    }

    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();

    try {
      _channel = WebSocketChannel.connect(Uri.parse(socketUrl));
      _connected = true;
      notifyListeners();

      _subscription = _channel!.stream.listen(
        _handleMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic event) {
    final raw = event is String ? event : event.toString();
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return;
    }

    _cpuPercent = _readDouble(decoded['cpu_percent']);
    _ramPercent = _readDouble(decoded['ram_percent']);
    _diskPercent = _readDouble(decoded['disk_percent']);
    _uptimeSeconds = _readInt(decoded['uptime_seconds']);
    notifyListeners();
  }

  double _readDouble(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  int _readInt(dynamic value) {
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  void _scheduleReconnect() {
    if (_disposed) {
      return;
    }

    _connected = false;
    notifyListeners();
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), connect);
  }

  @override
  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF050816), Color(0xFF0B1220), Color(0xFF111827)],
          ),
        ),
        child: SafeArea(
          child: Consumer<DashboardController>(
            builder: (context, controller, _) {
              return Padding(
                padding: const EdgeInsets.all(20),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final wideLayout = constraints.maxWidth >= 900;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Header(controller: controller),
                        const SizedBox(height: 20),
                        Expanded(
                          child: GridView.count(
                            crossAxisCount: wideLayout ? 3 : 1,
                            childAspectRatio: wideLayout ? 0.92 : 1.18,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            children: [
                              _GaugeCard(
                                title: 'CPU',
                                value: controller.cpuPercent,
                                unit: '%',
                              ),
                              _GaugeCard(
                                title: 'RAM',
                                value: controller.ramPercent,
                                unit: '%',
                              ),
                              _GaugeCard(
                                title: 'Disk',
                                value: controller.diskPercent,
                                unit: '%',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        _UptimeCard(uptimeSeconds: controller.uptimeSeconds),
                      ],
                    );
                  },
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'DevOps Monitoring Dashboard',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
              ),
              SizedBox(height: 6),
              Text(
                'Live infrastructure metrics streamed from FastAPI.',
                style: TextStyle(color: Color(0xFF94A3B8)),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFF1F2937)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: controller.connected ? const Color(0xFF22C55E) : const Color(0xFFEF4444),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: (controller.connected ? const Color(0xFF22C55E) : const Color(0xFFEF4444)).withOpacity(0.45),
                      blurRadius: 10,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                controller.connected ? 'Connected' : 'Disconnected',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GaugeCard extends StatelessWidget {
  const _GaugeCard({
    required this.title,
    required this.value,
    required this.unit,
  });

  final String title;
  final double value;
  final String unit;

  Color get _gaugeColor {
    if (value < 60) {
      return const Color(0xFF22C55E);
    }
    if (value <= 80) {
      return const Color(0xFFF59E0B);
    }
    return const Color(0xFFEF4444);
  }

  @override
  Widget build(BuildContext context) {
    final clampedValue = value.clamp(0, 100).toDouble();
    final remainder = 100 - clampedValue;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withOpacity(0.92),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF1F2937)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 18),
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    PieChart(
                      PieChartData(
                        sectionsSpace: 0,
                        startDegreeOffset: -90,
                        centerSpaceRadius: 66,
                        sections: [
                          PieChartSectionData(
                            value: clampedValue,
                            color: _gaugeColor,
                            radius: 18,
                            showTitle: false,
                          ),
                          PieChartSectionData(
                            value: remainder,
                            color: const Color(0xFF1E293B),
                            radius: 18,
                            showTitle: false,
                          ),
                        ],
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${clampedValue.toStringAsFixed(1)}$unit',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _statusLabel(clampedValue),
                          style: TextStyle(
                            color: _gaugeColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(double value) {
    if (value < 60) {
      return 'Healthy';
    }
    if (value <= 80) {
      return 'Warning';
    }
    return 'Critical';
  }
}

class _UptimeCard extends StatelessWidget {
  const _UptimeCard({required this.uptimeSeconds});

  final int uptimeSeconds;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120).withOpacity(0.92),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Uptime',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          Text(
            _formatUptime(uptimeSeconds),
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFFCBD5E1),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatUptime(int seconds) {
    final days = seconds ~/ 86400;
    final hours = (seconds % 86400) ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    return '${days}d ${hours}h ${minutes}m';
  }
}