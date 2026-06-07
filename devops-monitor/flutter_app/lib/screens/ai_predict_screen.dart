import 'dart:async';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_theme.dart';
import '../providers/metrics_provider.dart';
import '../providers/prediction_provider.dart';
import '../widgets/anomaly_timeline.dart';
import '../widgets/ai_chat_drawer.dart';

class AiPredictScreen extends StatelessWidget {
  const AiPredictScreen({super.key});

  void _showModelInfo(BuildContext context) => showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: AppTheme.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppTheme.border)),
          title: const Text('Model Info', style: TextStyle(color: AppTheme.textPrimary)),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoRow('Model', 'Prophet time-series'),
              SizedBox(height: 8),
              _InfoRow('Training window', '2 hours of data'),
              SizedBox(height: 8),
              _InfoRow('Refresh interval', '5 minutes'),
              SizedBox(height: 8),
              _InfoRow('Overload threshold', '85% CPU'),
            ],
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close', style: TextStyle(color: AppTheme.green)))],
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Consumer2<PredictionProvider, MetricsProvider>(
      builder: (_, pred, metrics, __) {
        final result  = pred.result;
        final history = metrics.rollingHistory;
        final anomalies = AnomalyTimeline.generateFromHistory(history);

        return Scaffold(
          backgroundColor: AppTheme.bgPrimary,
          appBar: AppBar(
            title: const Text('AI Predict'),
            actions: [
              IconButton(
                icon: const Icon(Icons.info_outline),
                onPressed: () => _showModelInfo(context),
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => showBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const AiChatDrawer(),
            ),
            backgroundColor: AppTheme.blue,
            icon: const Icon(Icons.chat_bubble_outline, color: Colors.white),
            label: const Text('Ask AI', style: TextStyle(color: Colors.white)),
          ),
          body: pred.isLoading && result == null
              ? const Center(child: CircularProgressIndicator(color: AppTheme.green, strokeWidth: 2))
              : result == null
                  ? const Center(child: Text('No prediction available', style: TextStyle(color: AppTheme.textMuted)))
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Prediction summary card
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0d1e2e),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.blue.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.psychology_outlined, color: AppTheme.blue, size: 20),
                                  const SizedBox(width: 8),
                                  const Text('AI Prediction',
                                      style: TextStyle(color: AppTheme.blueLight, fontWeight: FontWeight.w700, fontSize: 15)),
                                  const Spacer(),
                                  // Confidence bar
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${(result.confidence * 100).clamp(50, 100).toStringAsFixed(0)}% confidence',
                                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                      ),
                                      const SizedBox(height: 4),
                                      SizedBox(
                                        width: 80,
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: result.confidence.clamp(0.5, 1.0),
                                            backgroundColor: AppTheme.border,
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              result.confidence > 0.8 ? AppTheme.green : AppTheme.amber,
                                            ),
                                            minHeight: 5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              if (result.dataPointsUsed < 10) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.blue.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppTheme.blue.withValues(alpha: 0.4)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Collecting data... ${result.dataPointsUsed}/10 readings',
                                        style: const TextStyle(color: AppTheme.blueLight, fontSize: 13, fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 8),
                                      LinearProgressIndicator(
                                        value: result.dataPointsUsed / 10,
                                        backgroundColor: AppTheme.blue.withValues(alpha: 0.1),
                                        valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.blue),
                                        minHeight: 4,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 14),
                              if (result.willOverload) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.warning_rounded, color: AppTheme.red, size: 22),
                                    const SizedBox(width: 8),
                                    const Text('Overload predicted',
                                        style: TextStyle(color: AppTheme.red, fontWeight: FontWeight.bold, fontSize: 16)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text('Predicted max CPU: ${result.predictedMaxCpu.toStringAsFixed(1)}%',
                                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Text('Time until overload: ',
                                        style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                                    _CountdownTimer(seconds: result.minutesUntilOverload * 60),
                                  ],
                                ),
                              ] else ...[
                                Row(
                                  children: [
                                    const Icon(Icons.check_circle, color: AppTheme.green, size: 22),
                                    const SizedBox(width: 8),
                                    const Text('System looks stable',
                                        style: TextStyle(color: AppTheme.green, fontWeight: FontWeight.bold, fontSize: 16)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Predicted max CPU: ${result.predictedMaxCpu.toStringAsFixed(1)}% (safe)',
                                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                                ),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Forecast chart
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
                              const Text('CPU Forecast', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                              const SizedBox(height: 12),
                              SizedBox(
                                height: 180,
                                child: _ForecastChart(history: history, result: result),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  _LegendItem(color: AppTheme.green, label: 'Actual',    dashed: false),
                                  const SizedBox(width: 16),
                                  _LegendItem(color: AppTheme.blue,  label: 'Forecast',  dashed: true),
                                  const SizedBox(width: 16),
                                  _LegendItem(color: AppTheme.red,   label: 'Threshold (85%)', dashed: true),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Anomaly timeline
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
                              const Text('Recent anomalies',
                                  style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                              const SizedBox(height: 12),
                              AnomalyTimeline(events: anomalies),
                            ],
                          ),
                        ),

                        const SizedBox(height: 80),
                      ],
                    ),
        );
      },
    );
  }
}

class _ForecastChart extends StatelessWidget {
  final List<double> history;
  final dynamic result;

  const _ForecastChart({required this.history, required this.result});

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox();
    final hSpots = List.generate(history.length, (i) => FlSpot(i.toDouble(), history[i].clamp(0.0, 100.0)));

    final forecasts = result.forecast as List<Map<String, dynamic>>;
    final offset    = history.length.toDouble();
    final fSpots    = List.generate(
      forecasts.length,
      (i) => FlSpot(offset + i, ((forecasts[i]['yhat'] as num?)?.toDouble() ?? 0.0).clamp(0.0, 100.0)),
    );

    final maxX = (offset + forecasts.length - 1).clamp(1.0, double.infinity);

    return ClipRect(
      child: SizedBox(
        height: 200,
        child: LineChart(
          LineChartData(
            gridData: FlGridData(
              show: true,
              getDrawingHorizontalLine: (_) => FlLine(color: AppTheme.border.withValues(alpha: 0.4), strokeWidth: 0.5),
              getDrawingVerticalLine:   (_) => const FlLine(color: Colors.transparent),
            ),
            titlesData: FlTitlesData(
              show: true,
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: const AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 36,
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 22,
                  getTitlesWidget: (v, meta) {
                    final idx = v.toInt();
                    if (idx < 0) return const SizedBox();
                    
                    DateTime time;
                    if (idx < history.length) {
                      // history is usually polled every 3s, but let's assume it's roughly current
                      time = DateTime.now().subtract(Duration(seconds: (history.length - idx) * 3));
                    } else {
                      final forecastIdx = idx - history.length;
                      if (forecastIdx < forecasts.length) {
                        // forecast points are usually every minute or so in the backend
                        time = DateTime.now().add(Duration(minutes: forecastIdx + 1));
                      } else {
                        return const SizedBox();
                      }
                    }
                    
                    if (idx % (maxX / 4).ceil() != 0 && idx != 0 && idx != maxX.toInt()) return const SizedBox();

                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(color: AppTheme.textHint, fontSize: 9),
                      ),
                    );
                  },
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            lineTouchData: const LineTouchData(enabled: false),
            minY: 0,
            maxY: 100,
            minX: 0,
            maxX: maxX,
            extraLinesData: ExtraLinesData(
              horizontalLines: [
                HorizontalLine(
                  y: 85,
                  color: AppTheme.red.withValues(alpha: 0.6),
                  strokeWidth: 1.5,
                  dashArray: [4, 3],
                ),
              ],
            ),
            lineBarsData: [
              LineChartBarData(
                spots: hSpots,
                color: AppTheme.green,
                barWidth: 2,
                isCurved: true,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(show: true, color: AppTheme.green.withValues(alpha: 0.08)),
              ),
              if (fSpots.isNotEmpty)
                LineChartBarData(
                  spots: fSpots,
                  color: AppTheme.blue,
                  barWidth: 2,
                  isCurved: true,
                  dashArray: [5, 3],
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(show: true, color: AppTheme.blue.withValues(alpha: 0.06)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CountdownTimer extends StatefulWidget {
  final int seconds;
  const _CountdownTimer({required this.seconds});
  @override
  State<_CountdownTimer> createState() => _CountdownTimerState();
}

class _CountdownTimerState extends State<_CountdownTimer> {
  late int _remaining;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _remaining = widget.seconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remaining > 0) setState(() => _remaining--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final m = _remaining ~/ 60;
    final s = _remaining % 60;
    return Text(
      '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}',
      style: const TextStyle(color: AppTheme.red, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace'),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color  color;
  final String label;
  final bool   dashed;
  const _LegendItem({required this.color, required this.label, required this.dashed});
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 20, height: 2,
        color: dashed ? Colors.transparent : color,
        child: dashed
            ? Row(children: List.generate(4, (i) =>
                Container(width: 4, height: 2, margin: const EdgeInsets.only(right: 2),
                    color: i.isEven ? color : Colors.transparent)))
            : null,
      ),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
    ],
  );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text('$label: ', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
      Text(value,      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
    ],
  );
}
