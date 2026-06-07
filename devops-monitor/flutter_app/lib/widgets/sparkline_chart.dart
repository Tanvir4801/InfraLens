import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../constants/app_theme.dart';

class SparklineChart extends StatelessWidget {
  final List<double> data;
  final double height;
  final Color? lineColor;

  const SparklineChart({
    super.key,
    required this.data,
    this.height = 80,
    this.lineColor,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return SizedBox(height: height);
    }
    final color = lineColor ?? AppTheme.green;
    final spots = List.generate(
      data.length,
      (i) => FlSpot(i.toDouble(), data[i].toDouble()),
    );
    return SizedBox(
      height: height,
      child: LineChart(
        LineChartData(
          gridData: const FlGridData(show: false),
          titlesData: const FlTitlesData(show: false),
          borderData: FlBorderData(show: false),
          lineTouchData: LineTouchData(
            enabled: true,
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => AppTheme.bgCard,
              getTooltipItems: (spots) => spots.map((s) => LineTooltipItem(
                '${s.y.toStringAsFixed(1)}%',
                const TextStyle(color: AppTheme.green, fontWeight: FontWeight.bold, fontSize: 12),
              )).toList(),
            ),
          ),
          minY: 0,
          maxY: 100,
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: color,
              barWidth: 2,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [AppTheme.green.withValues(alpha: 0.3), AppTheme.green.withValues(alpha: 0.0)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
