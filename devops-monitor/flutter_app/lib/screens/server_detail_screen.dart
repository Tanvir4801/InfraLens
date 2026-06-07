import 'dart:async';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';
import '../models/server_info.dart';
import '../services/api_service.dart';
import '../widgets/circular_gauge.dart';

import '../widgets/pulse_dot.dart';

class ServerDetailScreen extends StatefulWidget {
  final ServerInfo server;
  const ServerDetailScreen({super.key, required this.server});
  @override
  State<ServerDetailScreen> createState() => _ServerDetailScreenState();
}

class _ServerDetailScreenState extends State<ServerDetailScreen> {
  final _api   = ApiService();
  List<Map<String, dynamic>> _history = [];
  Timer? _timer;
  final _transform = TransformationController();

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _transform.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    final h = await _api.fetchServerHistory(widget.server.name);
    if (mounted) setState(() => _history = h);
  }

  String _formatUptime(int seconds) {
    final d = seconds ~/ 86400;
    final h = (seconds % 86400) ~/ 3600;
    return d > 0 ? '${d}d ${h}h' : '${h}h ${seconds % 3600 ~/ 60}m';
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.server;
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: Row(
          children: [
            Hero(
              tag: 'server-dot-${s.name}',
              child: PulseDot(
                healthy: s.isHealthy,
                color: s.isHealthy ? AppTheme.green : (s.status.toLowerCase() == 'down' ? AppTheme.red : AppTheme.amber),
                size: 10,
              ),
            ),
            const SizedBox(width: 12),
            Text(s.name),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: (s.isHealthy ? AppTheme.green : AppTheme.amber).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              s.status,
              style: TextStyle(
                color: s.isHealthy ? AppTheme.green : AppTheme.amber,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Gauges
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    CircularGauge(value: s.cpu,  label: 'CPU',  color: AppTheme.getMetricColor(s.cpu)),
                    CircularGauge(value: s.ram,  label: 'RAM',  color: AppTheme.getMetricColor(s.ram)),
                    CircularGauge(value: s.disk, label: 'Disk', color: AppTheme.getMetricColor(s.disk)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _InfoPill('IP', s.ip),
                    _InfoPill('Role', s.role),
                    _InfoPill('Uptime', _formatUptime(s.uptime)),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // CPU history chart
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CPU history — last 1 hour',
                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 180,
                  child: _history.isEmpty
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.green, strokeWidth: 2))
                      : InteractiveViewer(
                          transformationController: _transform,
                          scaleEnabled: true,
                          child: LineChart(
                            LineChartData(
                              gridData: FlGridData(
                                show: true,
                                getDrawingHorizontalLine: (_) =>
                                    FlLine(color: AppTheme.border.withValues(alpha: 0.5), strokeWidth: 0.5),
                                getDrawingVerticalLine: (_) =>
                                    FlLine(color: AppTheme.border.withValues(alpha: 0.5), strokeWidth: 0.5),
                              ),
                              titlesData: FlTitlesData(
                                leftTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 36,
                                    getTitlesWidget: (v, _) => Text(
                                      '${v.toInt()}%',
                                      style: const TextStyle(color: AppTheme.textHint, fontSize: 10),
                                    ),
                                  ),
                                ),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 24,
                                    interval: (_history.length / 3).ceilToDouble().clamp(1, 100),
                                    getTitlesWidget: (v, _) {
                                      final idx = v.toInt();
                                      if (idx < 0 || idx >= _history.length) return const SizedBox();
                                      final ts = _history[idx]['ts'] as String? ?? '';
                                      try {
                                        final dt = DateTime.parse(ts);
                                        return Text(
                                          '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}',
                                          style: const TextStyle(color: AppTheme.textHint, fontSize: 9),
                                        );
                                      } catch (_) {
                                        return const SizedBox();
                                      }
                                    },
                                  ),
                                ),
                                topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              borderData: FlBorderData(
                                show: true,
                                border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
                              ),
                              minY: 0,
                              maxY: 100,
                              lineBarsData: [
                                LineChartBarData(
                                  spots: List.generate(_history.length, (i) {
                                    final cpu = (_history[i]['cpu'] as num?)?.toDouble() ?? 0.0;
                                    return FlSpot(i.toDouble(), cpu.clamp(0.0, 100.0));
                                  }),
                                  isCurved: true,
                                  color: AppTheme.green,
                                  barWidth: 2,
                                  dotData: const FlDotData(show: false),
                                  belowBarData: BarAreaData(
                                    show: true,
                                    color: AppTheme.green.withValues(alpha: 0.1),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  final String label;
  final String value;
  const _InfoPill(this.label, this.value);

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(label, style: const TextStyle(color: AppTheme.textHint, fontSize: 11)),
      const SizedBox(height: 2),
      Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
    ],
  );
}
